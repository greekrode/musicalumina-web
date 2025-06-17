import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  children: React.ReactNode;
  headerContent?: React.ReactNode;
}

function Modal({ isOpen, onClose, title, maxWidth = 'md', children, headerContent }: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={`w-full max-w-${maxWidth} mx-2 sm:mx-4 transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all max-h-[90vh] flex flex-col`}>
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between bg-marigold/10 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
                    <Dialog.Title
                      as="h3"
                      className="text-lg sm:text-2xl font-semibold leading-6 text-gray-900 pr-2"
                    >
                      {title}
                    </Dialog.Title>
                    <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                      {headerContent}
                      <button
                        type="button"
                        className="rounded-md text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 p-1"
                        onClick={onClose}
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                    {children}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default Modal;