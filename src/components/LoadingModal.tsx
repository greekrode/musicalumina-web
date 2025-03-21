import Modal from "./Modal";
import { useLanguage } from "../lib/LanguageContext";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface LoadingModalProps {
  isOpen: boolean;
}

function LoadingModal({ isOpen }: LoadingModalProps) {
  const { t } = useLanguage();

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title={t('loading.title')} maxWidth="md">
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Loading Spinner */}
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-marigold"></div>
        
        {/* Loading Message */}
        <div className="text-center space-y-3">
          <p className="text-base text-gray-600">
            {t('loading.message')}
          </p>
          <div className="mt-4 p-4 bg-yellow-50 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {t('loading.warning')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default LoadingModal; 