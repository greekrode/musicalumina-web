import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useLanguage } from "../lib/LanguageContext";
import PageTransition from "../components/PageTransition";
import { LarkService } from "../lib/lark";

function createVideoSubmissionSchema(t: (key: string) => string) {
  return z.object({
    registration_reference: z
      .string()
      .min(1, t("validation.enterReferenceCode"))
      .max(50, t("validation.maxReferenceLength"))
      .trim(),
    video_url: z
      .string()
      .min(1, t("validation.enterVideoUrl"))
      .url(t("validation.invalidUrl"))
      .trim(),
  });
}

type VideoSubmissionForm = z.infer<ReturnType<typeof createVideoSubmissionSchema>>;

interface ParticipantData {
  participantName: string;
  category: string;
  subCategory: string;
  songTitle: string;
  hasVideoSubmitted: boolean;
  existingVideoUrl?: string;
  recordId: string;
}

export default function VideoSubmissionPage() {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [participantData, setParticipantData] = useState<ParticipantData | null>(null);
  const [isLoadingParticipant, setIsLoadingParticipant] = useState(false);
  const [loadParticipantError, setLoadParticipantError] = useState<string | null>(null);

  const videoSubmissionSchema = createVideoSubmissionSchema(t);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<VideoSubmissionForm>({
    resolver: zodResolver(videoSubmissionSchema),
    defaultValues: {
      registration_reference: "",
      video_url: "",
    },
  });

  const registrationReference = watch("registration_reference");

  // Reset participant data when registration reference changes
  useEffect(() => {
    if (!registrationReference || registrationReference.trim() === "") {
      setParticipantData(null);
      setLoadParticipantError(null);
    }
  }, [registrationReference]);

  const loadParticipantData = async () => {
    if (!registrationReference || registrationReference.trim() === "") return;

    try {
      setIsLoadingParticipant(true);
      setLoadParticipantError(null);
      
      const data = await LarkService.searchParticipantData(registrationReference.trim());
      setParticipantData(data);
    } catch (error) {
      console.error("Failed to load participant data:", error);
      setLoadParticipantError(t("videoSubmissionForm.invalidReferenceCode"));
      setParticipantData(null);
    } finally {
      setIsLoadingParticipant(false);
    }
  };

  const onSubmit = async (data: VideoSubmissionForm) => {
    if (!participantData) {
      setError("root", {
        type: "manual",
        message: "Participant data not loaded. Please load participant data first.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Debug logging
      console.log("Submitting with recordId:", participantData.recordId);
      console.log("Participant data:", participantData);
      
      // Update video URL in Lark
      await LarkService.updateParticipantVideo(
        participantData.recordId,
        data.video_url,
        participantData.participantName,
        participantData.category,
        participantData.subCategory
      );
      
      setSubmitSuccess(true);
      reset();
      setParticipantData(null);
      
      // Reset success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);
      
    } catch (error) {
      console.error("Video submission failed:", error);
      setError("root", {
        type: "manual",
        message: error instanceof Error ? error.message : "Submission failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-offWhite pt-32 pb-16 px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow-xl rounded-lg p-10 sm:p-16">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {t("videoSubmissionForm.title")}
              </h1>
              <p className="text-gray-600 text-lg">
                {t("videoSubmissionForm.description")}
              </p>
            </div>

            {submitSuccess && (
              <div className="rounded-md bg-green-50 p-4 mb-8">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      {t("videoSubmissionForm.successMessage")}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative">
              {/* Loading Overlay */}
              {(isLoadingParticipant || isSubmitting) && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                  <div className="flex flex-col items-center">
                    <svg className="animate-spin h-8 w-8 text-marigold mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600 text-sm">
                      {isLoadingParticipant 
                        ? t("videoSubmissionForm.loadingParticipantData")
                        : t("videoSubmissionForm.submitting")}
                    </p>
                  </div>
                </div>
              )}

              {errors.root && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {errors.root.message}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {loadParticipantError && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {loadParticipantError}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Registration Reference Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t("videoSubmissionForm.referenceCode")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    {...register("registration_reference")}
                    placeholder={t("videoSubmissionForm.referenceCodePlaceholder")}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50 py-3 px-4 pr-10 text-base"
                    required
                  />
                  {registrationReference && registrationReference.trim() !== "" && (
                    <button
                      type="button"
                      onClick={() => {
                        reset({ registration_reference: "", video_url: "" });
                        setParticipantData(null);
                        setLoadParticipantError(null);
                      }}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {errors.registration_reference && (
                  <p className="mt-2 text-sm text-red-600">
                    {errors.registration_reference.message}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  {t("videoSubmissionForm.referenceCodeHelp")}
                </p>

                              {/* Load Participant Data Button */}
              {registrationReference && registrationReference.trim() !== "" && !participantData && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={loadParticipantData}
                    disabled={isLoadingParticipant}
                    className="flex justify-center items-center py-2 px-4 border border-marigold rounded-md shadow-sm text-sm font-medium text-marigold bg-white hover:bg-marigold hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-marigold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingParticipant && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isLoadingParticipant
                      ? t("videoSubmissionForm.loadingParticipantData")
                      : t("videoSubmissionForm.loadParticipantData")}
                  </button>
                </div>
              )}
              </div>

              {/* Participant Data Fields - shown only when data is loaded */}
              {participantData && (
                <div className="space-y-6 border-t border-gray-200 pt-8">
                  <h3 className="text-lg font-medium text-gray-900">Participant Information</h3>
                  
                  {/* Participant Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t("videoSubmissionForm.participantName")}
                    </label>
                    <input
                      type="text"
                      value={participantData.participantName}
                      disabled
                      className="block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 py-3 px-4 text-base text-gray-500"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t("videoSubmissionForm.category")}
                    </label>
                    <input
                      type="text"
                      value={participantData.category}
                      disabled
                      className="block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 py-3 px-4 text-base text-gray-500"
                    />
                  </div>

                  {/* Sub Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t("videoSubmissionForm.subCategory")}
                    </label>
                    <input
                      type="text"
                      value={participantData.subCategory}
                      disabled
                      className="block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 py-3 px-4 text-base text-gray-500"
                    />
                  </div>

                  {/* Song Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      {t("videoSubmissionForm.songTitle")}
                    </label>
                    <input
                      type="text"
                      value={participantData.songTitle}
                      disabled
                      className="block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 py-3 px-4 text-base text-gray-500"
                    />
                  </div>
                </div>
              )}

              {/* Video Already Submitted Warning - shown when video is already submitted */}
              {participantData && participantData.hasVideoSubmitted && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 mb-2">
                        ⚠️ {t("videoSubmissionForm.unableToSubmit")}
                      </h3>
                      <div className="text-sm text-red-700">
                        <strong>{t("videoSubmissionForm.existingVideoUrl")}:</strong>
                        <br />
                        <a 
                          href={participantData.existingVideoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 underline break-all"
                        >
                          {participantData.existingVideoUrl}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Video URL - shown only when participant data is loaded and no video submitted */}
              {participantData && !participantData.hasVideoSubmitted && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t("videoSubmissionForm.videoUrl")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    {...register("video_url")}
                    placeholder={t("videoSubmissionForm.videoUrlPlaceholder")}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-marigold focus:ring focus:ring-marigold focus:ring-opacity-50 py-3 px-4 text-base"
                    required
                  />
                  {errors.video_url && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.video_url.message}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {t("videoSubmissionForm.videoUrlHelp")}
                  </p>
                </div>
              )}

              {/* Warning Box - shown only when participant data is loaded and no video submitted */}
              {participantData && !participantData.hasVideoSubmitted && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        ⚠️ {t("videoSubmissionForm.warningMessage")}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button - shown only when participant data is loaded and no video submitted */}
              {participantData && !participantData.hasVideoSubmitted && (
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-marigold hover:bg-marigold/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-marigold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting && (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isSubmitting
                      ? t("videoSubmissionForm.submitting")
                      : t("videoSubmissionForm.submit")}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </PageTransition>
  );
} 