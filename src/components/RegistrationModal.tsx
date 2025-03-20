import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './Modal';
import FileUpload from './FileUpload';
import type { EventType } from '../lib/database.types';

const registrationSchema = z.object({
  registration_status: z.enum(['personal', 'parents', 'teacher']),
  registrant_name: z.string().optional(),
  registrant_whatsapp: z.string().min(10, 'Please enter a valid WhatsApp number'),
  registrant_email: z.string().email('Please enter a valid email address'),
  participant_name: z.string().min(3, 'Please enter the participant\'s full name'),
  category_id: z.string().uuid(),
  subcategory_id: z.string().uuid(),
  song_id: z.string().uuid().optional(),
  song_title: z.string().optional(),
  song_duration: z.string().optional(),
  birth_certificate: z.instanceof(File),
  song_pdf: z.instanceof(File).optional(),
  bank_name: z.string().min(1, 'Please enter the bank name'),
  bank_account_number: z.string().min(1, 'Please enter the account number'),
  bank_account_name: z.string().min(1, 'Please enter the account holder name'),
  payment_receipt: z.instanceof(File),
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

interface Category {
  id: string;
  name: string;
  event_subcategories: Array<{
    id: string;
    name: string;
    age_requirement: string;
  }>;
}

interface Song {
  id: string;
  title: string;
  duration: string;
}

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventType: EventType;
  categories?: Category[];
  songs?: Song[];
  onOpenTerms: () => void;
}

function RegistrationModal({ 
  isOpen, 
  onClose, 
  eventId, 
  eventType, 
  categories = [], 
  songs = [],
  onOpenTerms
}: RegistrationModalProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      registration_status: 'personal'
    }
  });

  const registrationStatus = watch('registration_status');
  const categoryId = watch('category_id');

  const selectedCategory = categories.find(cat => cat.id === categoryId);

  const onSubmit = async (data: RegistrationForm) => {
    try {
      // Handle file uploads to Supabase storage
      // Submit registration data
      onClose();
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Event Registration" maxWidth="4xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Registrant's Data */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Registrant's Data</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Registration Status</label>
            <select
              {...register('registration_status')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
            >
              <option value="personal">Personal</option>
              <option value="parents">Parents</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          {(registrationStatus !== 'personal') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Registrant Full Name</label>
              <input
                type="text"
                {...register('registrant_name')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
            <input
              type="text"
              {...register('registrant_whatsapp')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
            />
            {errors.registrant_whatsapp && (
              <p className="mt-1 text-sm text-red-600">{errors.registrant_whatsapp.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              {...register('registrant_email')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
            />
            {errors.registrant_email && (
              <p className="mt-1 text-sm text-red-600">{errors.registrant_email.message}</p>
            )}
          </div>
        </div>

        {/* Participant's Data */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Participant's Data</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              {...register('participant_name')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
            />
            {errors.participant_name && (
              <p className="mt-1 text-sm text-red-600">{errors.participant_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              {...register('category_id')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {selectedCategory && selectedCategory.event_subcategories && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Sub Category</label>
              <select
                {...register('subcategory_id')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
              >
                <option value="">Select a sub category</option>
                {selectedCategory.event_subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {`${sub.name} (${sub.age_requirement})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {eventType === 'festival' && songs.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700">Song Selection</label>
              <select
                {...register('song_id')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
              >
                <option value="">Select a song</option>
                {songs.map((song) => (
                  <option key={song.id} value={song.id}>
                    {song.title} ({song.duration})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Song Title</label>
                <input
                  type="text"
                  {...register('song_title')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Song Duration</label>
                <input
                  type="text"
                  {...register('song_duration')}
                  placeholder="e.g., 3:30"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
                />
              </div>
            </>
          )}
        </div>

        {/* Document Uploads */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Documents</h3>
          
          <FileUpload
            label="Birth Certificate/Passport"
            accept=".pdf,.jpg,.jpeg,.png"
            registration={register('birth_certificate')}
            error={errors.birth_certificate?.message}
          />

          <FileUpload
            label="Song PDF"
            accept=".pdf"
            registration={register('song_pdf')}
            error={errors.song_pdf?.message}
            optional
          />
        </div>

        {/* Payment Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Payment Information</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="font-medium">Bank Transfer Details:</p>
            <p>Bank Central Asia (BCA)</p>
            <p>3720421151</p>
            <p>RODERICK OR NICHOLAS</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Bank Name</label>
            <input
              type="text"
              {...register('bank_name')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Account Number</label>
            <input
              type="text"
              {...register('bank_account_number')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Account Holder Name</label>
            <input
              type="text"
              {...register('bank_account_name')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#CFB53B] focus:ring focus:ring-[#CFB53B] focus:ring-opacity-50"
            />
          </div>

          <FileUpload
            label="Payment Receipt"
            accept=".pdf,.jpg,.jpeg,.png"
            registration={register('payment_receipt')}
            error={errors.payment_receipt?.message}
          />
        </div>

        {/* Terms and Conditions */}
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                {...register('terms_accepted')}
                className="h-4 w-4 text-[#CFB53B] border-gray-300 rounded focus:ring-[#CFB53B]"
              />
            </div>
            <div className="ml-3">
              <label className="text-sm text-gray-700">
                By registering, I agree to all the{' '}
                <button
                  type="button"
                  onClick={onOpenTerms}
                  className="text-[#CFB53B] hover:text-[#CFB53B]/90 underline"
                >
                  terms & conditions
                </button>
              </label>
              {errors.terms_accepted && (
                <p className="mt-1 text-sm text-red-600">{errors.terms_accepted.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[#CFB53B] text-white rounded-md hover:bg-[#CFB53B]/90"
          >
            Submit Registration
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default RegistrationModal;