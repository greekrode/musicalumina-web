import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
} from "@headlessui/react";
import { Fragment } from "react";
import type { Database } from "../lib/database.types";

type Json = Database["public"]["Tables"]["event_jury"]["Row"]["credentials"];

type JuryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  juror: {
    name: string;
    title: string;
    avatar: string | null;
    description: string | null;
    credentials?: Json;
  };
};

export default function JuryModal({ isOpen, onClose, juror }: JuryModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center space-x-4 mb-4">
                  {juror.avatar && (
                    <img
                      src={juror.avatar}
                      alt={juror.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <DialogTitle
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      {juror.name}
                    </DialogTitle>
                    <p className="text-sm text-marigold">{juror.title}</p>
                  </div>
                </div>

                {juror.description && (
                  <div className="mt-2">
                    <div
                      className="text-sm text-gray-500"
                      dangerouslySetInnerHTML={{
                        __html: juror.description,
                      }}
                    />
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-marigold px-4 py-2 text-sm font-medium text-white hover:bg-marigold/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </DialogPanel>
            </Transition>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
