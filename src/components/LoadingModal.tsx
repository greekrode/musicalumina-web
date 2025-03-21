import Modal from "./Modal";

interface LoadingModalProps {
  isOpen: boolean;
}

function LoadingModal({ isOpen }: LoadingModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="" maxWidth="md">
      <div className="flex flex-col items-center justify-center py-6 space-y-6">
        {/* Loading Spinner */}
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-marigold"></div>
        
        {/* Loading Message */}
        <div className="text-center space-y-3">
          <h3 className="text-lg font-medium text-gray-900">
            Processing Your Registration
          </h3>
          <p className="text-sm text-gray-500">
            Please wait while we process your registration and upload your documents.
          </p>
          <div className="mt-4 p-4 bg-yellow-50 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Please do not close or refresh this page. Doing so may cause your registration to fail.
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