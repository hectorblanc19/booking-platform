"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_PROFILE = {
  logo_url: null,
  cover_url: null,
  theme: "modern",
  brand_color: "#2563EB",
  about: "",
  about_en: "",
  show_services: true,
  show_team: true,
  show_gallery: true,
  show_location: true,
  published: false,
};

export default function BusinessProfileCustomizer({
  businessId,
  lang = "es",
  showToast,
}) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [profileId, setProfileId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [serviceTranslations, setServiceTranslations] = useState([]);
  const [loadingServiceTranslations, setLoadingServiceTranslations] =
    useState(true);
  const [savingServiceId, setSavingServiceId] = useState(null);

const MAX_GALLERY_IMAGES = 10;


  const text =
    lang === "es"
      ? {
          title: "Personalizar mi página",
          subtitle:
            "Configura la identidad visual de tu negocio. Estos cambios no se mostrarán públicamente hasta que publiques tu página.",

          images: "Identidad visual",
          logo: "Logo del negocio",
          logoHelp:
            "Sube el logo de tu negocio. Se recomienda una imagen cuadrada.",
          cover: "Foto de portada",
          coverHelp:
            "Esta imagen será la portada principal de tu página. Se recomienda una imagen horizontal.",

          uploadLogo: "Subir logo",
          changeLogo: "Cambiar logo",
          uploadCover: "Subir portada",
          changeCover: "Cambiar portada",
          remove: "Eliminar",
          uploading: "Subiendo...",

          style: "Estilo",
          modern: "Moderno",
          elegant: "Elegante",
          minimal: "Minimalista",
          vibrant: "Vibrante",

          brandColor: "Color de tu marca",

          about: "Sobre nosotros",
          aboutPlaceholder:
            "Cuéntales a tus clientes un poco sobre tu negocio...",

          sections: "Mostrar en mi página",
          services: "Servicios",
          team: "Profesionales",
          gallery: "Galería",
          location: "Ubicación",

          status: "Estado",
          draft: "Borrador",
          published: "Publicada",

          save: "Guardar cambios",
          saving: "Guardando...",

          saved: "Cambios guardados correctamente.",
          loadError: "No se pudo cargar la personalización.",
          saveError: "No se pudieron guardar los cambios.",

          imageUploaded: "Imagen subida correctamente.",
          imageUploadError: "No se pudo subir la imagen.",
          imageRemoved: "Imagen eliminada correctamente.",
          imageRemoveError: "No se pudo eliminar la imagen.",
          invalidImage:
            "Selecciona una imagen JPG, PNG o WebP.",
          imageTooLarge:
            "La imagen no puede superar los 5 MB.",
        }
      : {
          title: "Customize my page",
          subtitle:
            "Configure your business identity. These changes will not appear publicly until you publish your page.",

          images: "Visual identity",
          logo: "Business logo",
          logoHelp:
            "Upload your business logo. A square image is recommended.",
          cover: "Cover photo",
          coverHelp:
            "This will be the main cover image on your page. A horizontal image is recommended.",

          uploadLogo: "Upload logo",
          changeLogo: "Change logo",
          uploadCover: "Upload cover",
          changeCover: "Change cover",
          remove: "Remove",
          uploading: "Uploading...",

          style: "Style",
          modern: "Modern",
          elegant: "Elegant",
          minimal: "Minimal",
          vibrant: "Vibrant",

          brandColor: "Brand color",

          about: "About us",
          aboutPlaceholder:
            "Tell your customers a little about your business...",

          sections: "Show on my page",
          services: "Services",
          team: "Professionals",
          gallery: "Gallery",
          location: "Location",

          status: "Status",
          draft: "Draft",
          published: "Published",

          save: "Save changes",
          saving: "Saving...",

          saved: "Changes saved successfully.",
          loadError: "Could not load customization.",
          saveError: "Could not save changes.",

          imageUploaded: "Image uploaded successfully.",
          imageUploadError: "Could not upload image.",
          imageRemoved: "Image removed successfully.",
          imageRemoveError: "Could not remove image.",
          invalidImage:
            "Select a JPG, PNG, or WebP image.",
          imageTooLarge:
            "The image cannot be larger than 5 MB.",
        };

 useEffect(() => {
  if (!businessId) return;

  loadProfile();
  loadGallery();
  loadServiceTranslations();
}, [businessId]);

  async function loadProfile() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("business_profile_settings")
        .select(
          `
            id,
            logo_url,
            cover_url,
            theme,
            brand_color,
            about,
            about_en,
            show_services,
            show_team,
            show_gallery,
            show_location,
            published
          `
        )
        .eq("business_id", businessId)
        .maybeSingle();

      if (error) {
        console.error("Business profile load error:", error);
        showToast?.(text.loadError);
        return;
      }

      if (!data) {
        setProfile(DEFAULT_PROFILE);
        setProfileId(null);
        return;
      }

      setProfile({
        logo_url: data.logo_url || null,
        cover_url: data.cover_url || null,
        theme: data.theme || "modern",
        brand_color: data.brand_color || "#2563EB",
        about: data.about || "",
        about_en: data.about_en || "",
        show_services: data.show_services ?? true,
        show_team: data.show_team ?? true,
        show_gallery: data.show_gallery ?? true,
        show_location: data.show_location ?? true,
        published: data.published ?? false,
      });

      setProfileId(data.id);
    } finally {
      setLoading(false);
    }
  }

  function updateProfile(field, value) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function loadServiceTranslations() {
    if (!businessId) return;

    setLoadingServiceTranslations(true);

    try {
      const { data, error } = await supabase
        .from("business_services")
        .select(
          `
            id,
            name,
            description,
            name_en,
            description_en,
            price,
            duration,
            provider_id,
            is_active
          `
        )
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Service translations load error:", error);
        showToast?.(
          lang === "es"
            ? "No se pudieron cargar las traducciones de los servicios."
            : "Could not load service translations."
        );
        return;
      }

      const grouped = Object.values(
        (data || []).reduce((groups, service) => {
          const key = [
            (service.name || "").trim().toLowerCase(),
            (service.description || "").trim().toLowerCase(),
            service.price ?? "",
            service.duration ?? "",
          ].join("|");

          if (!groups[key]) {
            groups[key] = {
              key,
              ids: [],
              name: service.name || "",
              description: service.description || "",
              name_en: service.name_en || "",
              description_en: service.description_en || "",
              price: service.price,
              duration: service.duration,
            };
          }

          groups[key].ids.push(service.id);

          // If one provider row already has an English translation,
          // use it to populate the editor for the grouped service.
          if (!groups[key].name_en && service.name_en) {
            groups[key].name_en = service.name_en;
          }

          if (
            !groups[key].description_en &&
            service.description_en
          ) {
            groups[key].description_en =
              service.description_en;
          }

          return groups;
        }, {})
      );

      setServiceTranslations(grouped);
    } finally {
      setLoadingServiceTranslations(false);
    }
  }

  function updateServiceTranslation(key, field, value) {
    setServiceTranslations((current) =>
      current.map((service) =>
        service.key === key
          ? {
              ...service,
              [field]: value,
            }
          : service
      )
    );
  }

  async function saveServiceTranslation(service) {
    if (!service?.ids?.length || savingServiceId) return;

    setSavingServiceId(service.key);

    try {
      const { error } = await supabase
        .from("business_services")
        .update({
          name_en: service.name_en.trim() || null,
          description_en:
            service.description_en.trim() || null,
        })
        .in("id", service.ids)
        .eq("business_id", businessId);

      if (error) {
        throw error;
      }

      showToast?.(
        lang === "es"
          ? "Traducción del servicio guardada."
          : "Service translation saved."
      );
    } catch (error) {
      console.error("Service translation save error:", error);

      showToast?.(
        lang === "es"
          ? "No se pudo guardar la traducción del servicio."
          : "Could not save the service translation."
      );
    } finally {
      setSavingServiceId(null);
    }
  }

  function validateImage(file) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      showToast?.(text.invalidImage);
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast?.(text.imageTooLarge);
      return false;
    }

    return true;
  }

  function getExtension(file) {
    const extension = file.name
      ?.split(".")
      .pop()
      ?.toLowerCase();

    if (extension === "jpg" || extension === "jpeg") {
      return "jpg";
    }

    if (extension === "png") {
      return "png";
    }

    if (extension === "webp") {
      return "webp";
    }

    if (file.type === "image/png") {
      return "png";
    }

    if (file.type === "image/webp") {
      return "webp";
    }

    return "jpg";
  }

  async function ensureProfileExists() {
    if (profileId) {
      return profileId;
    }

    const { data, error } = await supabase
      .from("business_profile_settings")
      .insert({
        business_id: businessId,
        theme: profile.theme,
        brand_color: profile.brand_color,
        about: profile.about.trim() || null,
        about_en: profile.about_en.trim() || null,
        show_services: profile.show_services,
        show_team: profile.show_team,
        show_gallery: profile.show_gallery,
        show_location: profile.show_location,
        published: false,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    setProfileId(data.id);

    return data.id;
  }

  async function uploadProfileImage(file, type) {
    if (!file || !businessId) return;
    if (!validateImage(file)) return;

    const isLogo = type === "logo";

    if (isLogo) {
      setUploadingLogo(true);
    } else {
      setUploadingCover(true);
    }

    try {
      await ensureProfileExists();

      const extension = getExtension(file);

      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${extension}`;

      const filePath = `${businessId}/${type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("business-profile-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("business-profile-images")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        throw new Error("Could not create public image URL.");
      }

      const column = isLogo ? "logo_url" : "cover_url";

      const oldUrl = profile[column];

      const { error: updateError } = await supabase
        .from("business_profile_settings")
        .update({
          [column]: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businessId);

      if (updateError) {
        // If DB update fails, remove the newly uploaded orphan file.
        await supabase.storage
          .from("business-profile-images")
          .remove([filePath]);

        throw updateError;
      }

      setProfile((current) => ({
        ...current,
        [column]: publicUrl,
      }));

      // Remove previous file only after the new image
      // was uploaded and saved successfully.
      if (oldUrl) {
        const oldPath = getStoragePathFromPublicUrl(oldUrl);

        if (oldPath) {
          const { error: oldDeleteError } =
            await supabase.storage
              .from("business-profile-images")
              .remove([oldPath]);

          if (oldDeleteError) {
            console.warn(
              "Old profile image could not be removed:",
              oldDeleteError
            );
          }
        }
      }

      showToast?.(text.imageUploaded);
    } catch (error) {
      console.error("Profile image upload error:", error);
      showToast?.(text.imageUploadError);
    } finally {
      if (isLogo) {
        setUploadingLogo(false);
      } else {
        setUploadingCover(false);
      }
    }
  }

  function getStoragePathFromPublicUrl(url) {
    if (!url) return null;

    try {
      const marker =
        "/storage/v1/object/public/business-profile-images/";

      const markerIndex = url.indexOf(marker);

      if (markerIndex === -1) {
        return null;
      }

      const path = url.substring(
        markerIndex + marker.length
      );

      return decodeURIComponent(path);
    } catch (error) {
      console.error(
        "Could not determine storage image path:",
        error
      );

      return null;
    }
  }

async function loadGallery() {
  if (!businessId) return;

  setLoadingGallery(true);

  try {
    const { data, error } = await supabase
      .from("business_gallery")
      .select("id, image_url, sort_order, created_at")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Gallery load error:", error);
      return;
    }

    setGallery(data || []);
  } finally {
    setLoadingGallery(false);
  }
}

async function uploadGalleryImages(files) {
  if (!businessId || !files?.length) return;

  const selectedFiles = Array.from(files);

  const availableSlots =
    MAX_GALLERY_IMAGES - gallery.length;

  if (availableSlots <= 0) {
    showToast?.(
      lang === "es"
        ? "La galería permite un máximo de 10 fotos."
        : "The gallery allows a maximum of 10 photos."
    );
    return;
  }

  if (selectedFiles.length > availableSlots) {
    showToast?.(
      lang === "es"
        ? `Solo puedes agregar ${availableSlots} foto${
            availableSlots === 1 ? "" : "s"
          } más.`
        : `You can only add ${availableSlots} more image${
            availableSlots === 1 ? "" : "s"
          }.`
    );
    return;
  }

  for (const file of selectedFiles) {
    if (!validateImage(file)) {
      return;
    }
  }

  setUploadingGallery(true);

  const uploadedItems = [];

  try {
    await ensureProfileExists();

    let nextSortOrder =
      gallery.length > 0
        ? Math.max(
            ...gallery.map((item) =>
              Number(item.sort_order || 0)
            )
          ) + 1
        : 0;

    for (const file of selectedFiles) {
      const extension = getExtension(file);

      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${extension}`;

      const filePath =
        `${businessId}/gallery/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("business-profile-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("business-profile-images")
          .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        await supabase.storage
          .from("business-profile-images")
          .remove([filePath]);

        throw new Error(
          "Could not create gallery image URL."
        );
      }

      const { data: galleryRow, error: insertError } =
        await supabase
          .from("business_gallery")
          .insert({
            business_id: businessId,
            image_url: publicUrl,
            sort_order: nextSortOrder,
          })
          .select(
            "id, image_url, sort_order, created_at"
          )
          .single();

      if (insertError) {
        await supabase.storage
          .from("business-profile-images")
          .remove([filePath]);

        throw insertError;
      }

      uploadedItems.push(galleryRow);
      nextSortOrder += 1;
    }

    setGallery((current) => [
      ...current,
      ...uploadedItems,
    ]);

    showToast?.(
      lang === "es"
        ? selectedFiles.length === 1
          ? "Foto agregada a la galería."
          : "Fotos agregadas a la galería."
        : selectedFiles.length === 1
        ? "Photo added to gallery."
        : "Photos added to gallery."
    );
  } catch (error) {
    console.error("Gallery upload error:", error);

    // Reload from the database so the UI reflects
    // any photos that successfully saved before an error.
    await loadGallery();

    showToast?.(
      lang === "es"
        ? "No se pudieron subir todas las fotos."
        : "Not all photos could be uploaded."
    );
  } finally {
    setUploadingGallery(false);
  }
}

async function removeGalleryImage(item) {
  if (!item?.id || !item?.image_url) return;

  try {
    const { error: deleteError } = await supabase
      .from("business_gallery")
      .delete()
      .eq("id", item.id)
      .eq("business_id", businessId);

    if (deleteError) {
      throw deleteError;
    }

    setGallery((current) =>
      current.filter(
        (galleryItem) =>
          galleryItem.id !== item.id
      )
    );

    const storagePath =
      getStoragePathFromPublicUrl(item.image_url);

    if (storagePath) {
      const { error: storageError } =
        await supabase.storage
          .from("business-profile-images")
          .remove([storagePath]);

      if (storageError) {
        console.warn(
          "Gallery row deleted but storage cleanup failed:",
          storageError
        );
      }
    }

    showToast?.(
      lang === "es"
        ? "Foto eliminada de la galería."
        : "Photo removed from gallery."
    );
  } catch (error) {
    console.error(
      "Gallery image delete error:",
      error
    );

    showToast?.(
      lang === "es"
        ? "No se pudo eliminar la foto."
        : "Could not remove the photo."
    );
  }
}

  async function removeProfileImage(type) {
    if (!businessId) return;

    const isLogo = type === "logo";
    const column = isLogo ? "logo_url" : "cover_url";
    const currentUrl = profile[column];

    if (!currentUrl) return;

    if (isLogo) {
      setUploadingLogo(true);
    } else {
      setUploadingCover(true);
    }

    try {
      // First remove the URL from the database.
      // This prevents a broken image from remaining
      // on the business profile if storage deletion fails.
      const { error: updateError } = await supabase
        .from("business_profile_settings")
        .update({
          [column]: null,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businessId);

      if (updateError) {
        throw updateError;
      }

      setProfile((current) => ({
        ...current,
        [column]: null,
      }));

      const storagePath =
        getStoragePathFromPublicUrl(currentUrl);

      if (storagePath) {
        const { error: removeError } =
          await supabase.storage
            .from("business-profile-images")
            .remove([storagePath]);

        if (removeError) {
          console.warn(
            "Image URL removed, but storage cleanup failed:",
            removeError
          );
        }
      }

      showToast?.(text.imageRemoved);
    } catch (error) {
      console.error("Profile image remove error:", error);
      showToast?.(text.imageRemoveError);
    } finally {
      if (isLogo) {
        setUploadingLogo(false);
      } else {
        setUploadingCover(false);
      }
    }
  }

  async function saveProfile() {
    if (!businessId || saving) return;

    setSaving(true);

    try {
      const payload = {
        business_id: businessId,
        logo_url: profile.logo_url,
        cover_url: profile.cover_url,
        theme: profile.theme,
        brand_color: profile.brand_color,
        about: profile.about.trim() || null,
        about_en: profile.about_en.trim() || null,
        show_services: profile.show_services,
        show_team: profile.show_team,
        show_gallery: profile.show_gallery,
        show_location: profile.show_location,
        published: profile.published,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (profileId) {
        result = await supabase
          .from("business_profile_settings")
          .update(payload)
          .eq("id", profileId)
          .eq("business_id", businessId)
          .select("id")
          .single();
      } else {
        result = await supabase
          .from("business_profile_settings")
          .insert(payload)
          .select("id")
          .single();
      }

      if (result.error) {
        console.error(
          "Business profile save error:",
          result.error
        );

        showToast?.(text.saveError);
        return;
      }

      if (!profileId && result.data?.id) {
        setProfileId(result.data.id);
      }

      showToast?.(text.saved);
    } finally {
      setSaving(false);
    }
  }


  function openPublicProfile() {
    if (!businessId || !profile.published) return;

    window.open(
      `/business/${businessId}/profile`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copyPublicProfileLink() {
    if (!businessId || !profile.published) return;

    const publicUrl = `${window.location.origin}/business/${businessId}/profile`;

    try {
      await navigator.clipboard.writeText(publicUrl);

      showToast?.(
        lang === "es"
          ? "Enlace público copiado."
          : "Public link copied."
      );
    } catch (error) {
      console.error("Could not copy public profile link:", error);

      showToast?.(
        lang === "es"
          ? "No se pudo copiar el enlace."
          : "Could not copy the link."
      );
    }
  }


  async function togglePublish() {
    if (
      !businessId ||
      publishing ||
      saving ||
      uploadingLogo ||
      uploadingCover ||
      uploadingGallery
    ) {
      return;
    }

    setPublishing(true);

    try {
      const newPublishedState = !profile.published;

      const payload = {
        business_id: businessId,
        logo_url: profile.logo_url,
        cover_url: profile.cover_url,
        theme: profile.theme,
        brand_color: profile.brand_color,
        about: profile.about.trim() || null,
        about_en: profile.about_en.trim() || null,
        show_services: profile.show_services,
        show_team: profile.show_team,
        show_gallery: profile.show_gallery,
        show_location: profile.show_location,
        published: newPublishedState,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (profileId) {
        result = await supabase
          .from("business_profile_settings")
          .update(payload)
          .eq("id", profileId)
          .eq("business_id", businessId)
          .select("id, published")
          .single();
      } else {
        result = await supabase
          .from("business_profile_settings")
          .insert(payload)
          .select("id, published")
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      if (!profileId && result.data?.id) {
        setProfileId(result.data.id);
      }

      setProfile((current) => ({
        ...current,
        published: newPublishedState,
      }));

      showToast?.(
        newPublishedState
          ? lang === "es"
            ? "Página publicada correctamente."
            : "Page published successfully."
          : lang === "es"
          ? "La página volvió a borrador."
          : "The page is now a draft."
      );
    } catch (error) {
      console.error("Business profile publish error:", error);

      showToast?.(
        lang === "es"
          ? "No se pudo cambiar el estado de publicación."
          : "Could not change the publication status."
      );
    } finally {
      setPublishing(false);
    }
  }

  const themes = [
    {
      value: "modern",
      label: text.modern,
      description: "Aa",
    },
    {
      value: "elegant",
      label: text.elegant,
      description: "Aa",
    },
    {
      value: "minimal",
      label: text.minimal,
      description: "Aa",
    },
    {
      value: "vibrant",
      label: text.vibrant,
      description: "Aa",
    },
  ];

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-7 bg-gray-200 rounded w-56" />
          <div className="h-4 bg-gray-200 rounded w-full max-w-lg" />
          <div className="h-24 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* HEADER */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              🎨 {text.title}
            </h2>

            <p className="text-sm text-gray-600 mt-2 max-w-2xl">
              {text.subtitle}
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
              profile.published
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                profile.published
                  ? "bg-green-500"
                  : "bg-amber-500"
              }`}
            />

            {text.status}:{" "}
            {profile.published
              ? text.published
              : text.draft}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">

        {/* VISUAL IDENTITY */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4">
            {text.images}
          </h3>

          <div className="grid md:grid-cols-2 gap-5">
            {/* LOGO */}
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-gray-900">
                {text.logo}
              </p>

              <p className="text-xs text-gray-500 mt-1 mb-4">
                {text.logoHelp}
              </p>

              {profile.logo_url ? (
                <div className="mb-4">
                  <div className="w-32 h-32 rounded-xl border bg-gray-50 overflow-hidden flex items-center justify-center">
                    <img
                      src={profile.logo_url}
                      alt="Business logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center mb-4 text-gray-400 text-3xl">
                  🏢
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <label
                  className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer ${
                    uploadingLogo
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {uploadingLogo
                    ? text.uploading
                    : profile.logo_url
                    ? text.changeLogo
                    : text.uploadLogo}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0];

                      if (file) {
                        uploadProfileImage(
                          file,
                          "logo"
                        );
                      }

                      event.target.value = "";
                    }}
                  />
                </label>

                {profile.logo_url && (
                  <button
                    type="button"
                    onClick={() =>
                      removeProfileImage("logo")
                    }
                    disabled={uploadingLogo}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {text.remove}
                  </button>
                )}
              </div>
            </div>

            {/* COVER */}
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-gray-900">
                {text.cover}
              </p>

              <p className="text-xs text-gray-500 mt-1 mb-4">
                {text.coverHelp}
              </p>

              {profile.cover_url ? (
                <div className="w-full h-40 rounded-xl border bg-gray-50 overflow-hidden mb-4">
                  <img
                    src={profile.cover_url}
                    alt="Business cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-40 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center mb-4 text-gray-400">
                  <div className="text-center">
                    <div className="text-3xl">
                      🖼️
                    </div>

                    <div className="text-xs mt-2">
                      {text.cover}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <label
                  className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer ${
                    uploadingCover
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {uploadingCover
                    ? text.uploading
                    : profile.cover_url
                    ? text.changeCover
                    : text.uploadCover}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingCover}
                    onChange={(event) => {
                      const file =
                        event.target.files?.[0];

                      if (file) {
                        uploadProfileImage(
                          file,
                          "cover"
                        );
                      }

                      event.target.value = "";
                    }}
                  />
                </label>

                {profile.cover_url && (
                  <button
                    type="button"
                    onClick={() =>
                      removeProfileImage("cover")
                    }
                    disabled={uploadingCover}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {text.remove}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

{/* GALLERY */}
<div>
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
    <div>
      <h3 className="font-bold text-gray-900">
        {lang === "es"
          ? "Galería del negocio"
          : "Business gallery"}
      </h3>

      <p className="text-xs text-gray-500 mt-1">
        {lang === "es"
          ? "Agrega fotos de tus trabajos, espacio, productos o resultados."
          : "Add photos of your work, space, products, or results."}
      </p>
    </div>

    <div className="text-sm text-gray-500">
      {gallery.length}/{MAX_GALLERY_IMAGES}
    </div>
  </div>

  {loadingGallery ? (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {[1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="aspect-square bg-gray-100 rounded-xl animate-pulse"
        />
      ))}
    </div>
  ) : (
    <>
      {gallery.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
          {gallery.map((item) => (
            <div
              key={item.id}
              className="relative group aspect-square rounded-xl overflow-hidden border bg-gray-100"
            >
              <img
                src={item.image_url}
                alt="Gallery"
                className="w-full h-full object-cover"
              />

              <button
                type="button"
                onClick={() =>
                  removeGalleryImage(item)
                }
                className="absolute top-2 right-2 bg-black/75 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition"
                title={
                  lang === "es"
                    ? "Eliminar foto"
                    : "Delete photo"
                }
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {gallery.length < MAX_GALLERY_IMAGES && (
        <label
          className={`border-2 border-dashed rounded-xl min-h-32 flex flex-col items-center justify-center text-center p-5 transition ${
            uploadingGallery
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer"
          }`}
        >
          <div className="text-3xl mb-2">
            📷
          </div>

          <div className="font-semibold text-gray-900">
            {uploadingGallery
              ? lang === "es"
                ? "Subiendo fotos..."
                : "Uploading photos..."
              : lang === "es"
              ? "Agregar fotos"
              : "Add photos"}
          </div>

          <div className="text-xs text-gray-500 mt-1">
            {lang === "es"
              ? `Puedes agregar hasta ${
                  MAX_GALLERY_IMAGES -
                  gallery.length
                } foto${
                  MAX_GALLERY_IMAGES -
                    gallery.length ===
                  1
                    ? ""
                    : "s"
                } más.`
              : `You can add up to ${
                  MAX_GALLERY_IMAGES -
                  gallery.length
                } more image${
                  MAX_GALLERY_IMAGES -
                    gallery.length ===
                  1
                    ? ""
                    : "s"
                }.`}
          </div>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={uploadingGallery}
            className="hidden"
            onChange={(event) => {
              const files = event.target.files;

              if (files?.length) {
                uploadGalleryImages(files);
              }

              event.target.value = "";
            }}
          />
        </label>
      )}

      {gallery.length ===
        MAX_GALLERY_IMAGES && (
        <div className="border rounded-xl p-4 bg-gray-50 text-sm text-gray-600">
          {lang === "es"
            ? "Has alcanzado el máximo de 10 fotos. Puedes eliminar una foto para agregar otra."
            : "You have reached the 10-photo limit. Delete a photo to add another."}
        </div>
      )}
    </>
  )}
</div>

        {/* THEME */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">
            {text.style}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {themes.map((theme) => {
              const selected =
                profile.theme === theme.value;

              return (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() =>
                    updateProfile(
                      "theme",
                      theme.value
                    )
                  }
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    selected
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`text-2xl mb-3 ${
                      theme.value === "elegant"
                        ? "font-serif"
                        : theme.value ===
                          "minimal"
                        ? "font-light"
                        : theme.value ===
                          "vibrant"
                        ? "font-black"
                        : "font-bold"
                    }`}
                  >
                    {theme.description}
                  </div>

                  <div className="text-sm font-semibold text-gray-900">
                    {theme.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* BRAND COLOR */}
        <div>
          <h3 className="font-bold text-gray-900 mb-3">
            {text.brandColor}
          </h3>

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={profile.brand_color}
              onChange={(event) =>
                updateProfile(
                  "brand_color",
                  event.target.value
                )
              }
              className="w-14 h-12 rounded-lg border border-gray-300 cursor-pointer p-1 bg-white"
            />

            <input
              type="text"
              value={profile.brand_color}
              onChange={(event) =>
                updateProfile(
                  "brand_color",
                  event.target.value
                )
              }
              maxLength={7}
              className="border border-gray-300 rounded-xl px-4 py-3 w-32 uppercase"
              placeholder="#2563EB"
            />

            <div
              className="h-12 flex-1 max-w-xs rounded-xl border"
              style={{
                backgroundColor:
                  profile.brand_color,
              }}
            />
          </div>
        </div>

        {/* ABOUT — BILINGUAL */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4">
            {lang === "es" ? "Sobre nosotros" : "About us"}
          </h3>

          <div className="grid lg:grid-cols-2 gap-5">
            <div>
              <div className="flex justify-between gap-4 mb-2">
                <label className="text-sm font-semibold text-gray-800">
                  🇪🇸 Sobre nosotros — Español
                </label>

                <span className="text-xs text-gray-400">
                  {profile.about.length}/1000
                </span>
              </div>

              <textarea
                value={profile.about}
                onChange={(event) => {
                  if (event.target.value.length <= 1000) {
                    updateProfile("about", event.target.value);
                  }
                }}
                placeholder="Cuéntales a tus clientes un poco sobre tu negocio..."
                rows={6}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between gap-4 mb-2">
                <label className="text-sm font-semibold text-gray-800">
                  🇺🇸 About us — English
                </label>

                <span className="text-xs text-gray-400">
                  {profile.about_en.length}/1000
                </span>
              </div>

              <textarea
                value={profile.about_en}
                onChange={(event) => {
                  if (event.target.value.length <= 1000) {
                    updateProfile("about_en", event.target.value);
                  }
                }}
                placeholder="Tell your customers a little about your business..."
                rows={6}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <p className="text-xs text-gray-500 mt-2">
                {lang === "es"
                  ? "Si dejas el inglés vacío, la página mostrará el texto en español como respaldo."
                  : "If English is left empty, the page will fall back to the Spanish text."}
              </p>
            </div>
          </div>
        </div>

        {/* SERVICE TRANSLATIONS */}
        <div>
          <div className="mb-4">
            <h3 className="font-bold text-gray-900">
              {lang === "es"
                ? "Servicios — Inglés"
                : "Services — English"}
            </h3>

            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
              {lang === "es"
                ? "Agrega cómo quieres que aparezcan tus servicios cuando el cliente seleccione EN. Esto no cambia el servicio, precio, duración ni disponibilidad."
                : "Add how your services should appear when a customer selects EN. This does not change the service, price, duration, or availability."}
            </p>
          </div>

          {loadingServiceTranslations ? (
            <div className="space-y-3">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="h-40 rounded-xl bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          ) : serviceTranslations.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-xl p-5 text-sm text-gray-500 bg-gray-50">
              {lang === "es"
                ? "No hay servicios activos para traducir."
                : "There are no active services to translate."}
            </div>
          ) : (
            <div className="space-y-4">
              {serviceTranslations.map((service) => (
                <div
                  key={service.key}
                  className="border border-gray-200 rounded-xl p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        🇪🇸 {lang === "es" ? "Servicio actual" : "Current service"}
                      </div>

                      <div className="font-bold text-gray-900 mt-1">
                        {service.name}
                      </div>

                      {service.description && (
                        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                          {service.description}
                        </p>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 sm:text-right">
                      {service.price !== null &&
                        service.price !== undefined && (
                          <div>
                            RD${Number(service.price).toLocaleString("es-DO")}
                          </div>
                        )}

                      {service.duration && (
                        <div className="mt-1">
                          {service.duration}{" "}
                          {lang === "es" ? "minutos" : "minutes"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        🇺🇸 Name — English
                      </label>

                      <input
                        type="text"
                        value={service.name_en}
                        onChange={(event) =>
                          updateServiceTranslation(
                            service.key,
                            "name_en",
                            event.target.value
                          )
                        }
                        placeholder="Example: Classic Manicure"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        🇺🇸 Description — English
                      </label>

                      <textarea
                        value={service.description_en}
                        onChange={(event) =>
                          updateServiceTranslation(
                            service.key,
                            "description_en",
                            event.target.value
                          )
                        }
                        placeholder="Example: Cleaning, cuticle care, nail shaping and polish."
                        rows={3}
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 mt-4">
                    <p className="text-xs text-gray-500">
                      {service.ids.length > 1
                        ? lang === "es"
                          ? `Esta traducción se aplicará a ${service.ids.length} registros del mismo servicio.`
                          : `This translation will be applied to ${service.ids.length} matching service records.`
                        : lang === "es"
                        ? "Si el inglés queda vacío, la página usará el texto en español."
                        : "If English is left empty, the page will use the Spanish text."}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        saveServiceTranslation(service)
                      }
                      disabled={
                        savingServiceId === service.key
                      }
                      className="flex-shrink-0 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingServiceId === service.key
                        ? lang === "es"
                          ? "Guardando..."
                          : "Saving..."
                        : lang === "es"
                        ? "Guardar traducción"
                        : "Save translation"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTIONS */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4">
            {text.sections}
          </h3>

          <div className="grid sm:grid-cols-2 gap-3">
            <ToggleOption
              label={text.services}
              checked={profile.show_services}
              onChange={(checked) =>
                updateProfile(
                  "show_services",
                  checked
                )
              }
            />

            <ToggleOption
              label={text.team}
              checked={profile.show_team}
              onChange={(checked) =>
                updateProfile(
                  "show_team",
                  checked
                )
              }
            />

            <ToggleOption
              label={text.gallery}
              checked={profile.show_gallery}
              onChange={(checked) =>
                updateProfile(
                  "show_gallery",
                  checked
                )
              }
            />

            <ToggleOption
              label={text.location}
              checked={profile.show_location}
              onChange={(checked) =>
                updateProfile(
                  "show_location",
                  checked
                )
              }
            />
          </div>
        </div>

        {/* SAVE + PREVIEW + PUBLISH */}
        <div className="border-t border-gray-100 pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={saveProfile}
              disabled={
                saving ||
                publishing ||
                uploadingLogo ||
                uploadingCover ||
                uploadingGallery
              }
              className="w-full sm:w-auto bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? text.saving : text.save}
            </button>

            <button
              type="button"
              onClick={() => {
                window.open(
                  `/business/${businessId}/profile-preview`,
                  "_blank",
                  "noopener,noreferrer"
                );
              }}
              disabled={
                saving ||
                publishing ||
                uploadingLogo ||
                uploadingCover ||
                uploadingGallery
              }
              className="w-full sm:w-auto bg-white text-gray-900 border border-gray-300 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              👁️ {lang === "es" ? "Vista previa" : "Preview"}
            </button>

            <button
              type="button"
              onClick={togglePublish}
              disabled={
                publishing ||
                saving ||
                uploadingLogo ||
                uploadingCover ||
                uploadingGallery
              }
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                profile.published
                  ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {publishing
                ? lang === "es"
                  ? "Procesando..."
                  : "Processing..."
                : profile.published
                ? lang === "es"
                  ? "Despublicar"
                  : "Unpublish"
                : lang === "es"
                ? "🚀 Publicar página"
                : "🚀 Publish page"}
            </button>

            {profile.published && (
              <>
                <button
                  type="button"
                  onClick={openPublicProfile}
                  className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
                >
                  🌐 {lang === "es" ? "Abrir página pública" : "Open public page"}
                </button>

                <button
                  type="button"
                  onClick={copyPublicProfileLink}
                  className="w-full sm:w-auto bg-white text-gray-900 border border-gray-300 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  🔗 {lang === "es" ? "Copiar enlace" : "Copy link"}
                </button>
              </>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-3">
            {lang === "es"
              ? profile.published
                ? "Tu página está publicada. Los cambios que guardes se reflejarán en la página pública."
                : "La vista previa es privada. Tus clientes no verán esta página hasta que la publiques."
              : profile.published
              ? "Your page is published. Saved changes will appear on the public page."
              : "The preview is private. Customers will not see this page until you publish it."}
          </p>
        </div>

      </div>
    </section>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="flex items-center justify-between gap-4 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-50">
      <span className="text-sm font-medium text-gray-800">
        {label}
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition mt-0.5 ${
            checked
              ? "translate-x-5"
              : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}