import { Mail, Phone, MapPin } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { useImagePreloader } from "../hooks/useImagePreloader";
import heroBg from "../assets/contact-hero-bg.jpg";
import LoadingSpinner from "../components/LoadingSpinner";
import { useState } from "react";
import { sendContactMessage } from "../lib/supabase";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactSchema>;

function ContactPage() {
  usePageTitle("Contact");
  const isLoading = useImagePreloader(heroBg);

  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await sendContactMessage(formData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to send message');
      }
      setSuccess(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error('Error sending message:', err);
      setError(
        err instanceof Error 
          ? err.message 
          : 'Failed to send message. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFF0]">
        <LoadingSpinner message="Loading contact page..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fadeIn">
      {/* Hero Section */}
      <section className="relative h-[40vh]">
        <div className="absolute inset-0">
          <img
            src={heroBg}
            alt="Piano keys"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-center w-full">
            <h1 className="text-4xl md:text-5xl font-playfair text-[#FFFFF0] mb-4">
              Contact Us
            </h1>
            <p className="text-xl text-[#F7E7CE]">Get in touch with our team</p>
          </div>
        </div>
      </section>

      <div className="py-20 bg-[#FFFFF0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-playfair text-[#808080] mb-4">
              How Can We Help?
            </h2>
            <p className="text-lg text-[#808080]/80 max-w-2xl mx-auto">
              Have questions about our competitions or programs? We'd love to
              hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-playfair text-[#808080] mb-6">
                Send Us a Message
              </h2>
              {error && (
                <div className="mb-6 p-4 rounded-md bg-red-100 text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="mb-6 p-4 rounded-md bg-green-100 text-green-700">
                  Message sent successfully! We'll get back to you soon.
                </div>
              )}
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-[#808080] mb-2"
                  >
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-4 py-2 rounded-md border border-[#CFB53B]/20 focus:outline-none focus:ring-2 focus:ring-[#CFB53B]/50"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[#808080] mb-2"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 rounded-md border border-[#CFB53B]/20 focus:outline-none focus:ring-2 focus:ring-[#CFB53B]/50"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-[#808080] mb-2"
                  >
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 rounded-md border border-[#CFB53B]/20 focus:outline-none focus:ring-2 focus:ring-[#CFB53B]/50"
                    placeholder="Competition Inquiry"
                  />
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-[#808080] mb-2"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 rounded-md border border-[#CFB53B]/20 focus:outline-none focus:ring-2 focus:ring-[#CFB53B]/50"
                    placeholder="Your message here..."
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full bg-[#CFB53B] text-white px-6 py-3 rounded-md transition-colors ${
                    isSubmitting
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:bg-[#CFB53B]/90"
                  }`}
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>

            <div className="space-y-8">
              <div className="bg-white p-8 rounded-lg shadow-lg">
                <h2 className="text-2xl font-playfair text-[#808080] mb-6">
                  Contact Information
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <Mail className="h-6 w-6 text-[#CFB53B] mt-1" />
                    <div>
                      <h3 className="font-medium text-[#808080]">Email</h3>
                      <a
                        href="mailto:contact@musicalumina.com"
                        className="text-[#808080]/80 hover:text-[#CFB53B] transition-colors"
                      >
                        contact@musicalumina.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <Phone className="h-6 w-6 text-[#CFB53B] mt-1" />
                    <div>
                      <h3 className="font-medium text-[#808080]">Phone</h3>
                      <a
                        href="https://wa.me/6282161505577"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#808080]/80 hover:text-[#CFB53B] transition-colors"
                      >
                        +62 821 6150 5577
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <MapPin className="h-6 w-6 text-[#CFB53B] mt-1" />
                    <div>
                      <h3 className="font-medium text-[#808080]">Location</h3>
                      <p className="text-[#808080]/80">Jakarta, Indonesia</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-lg">
                <h2 className="text-2xl font-playfair text-[#808080] mb-6">
                  Office Hours
                </h2>
                <div className="space-y-2">
                  <p className="text-[#808080]/80">
                    <span className="font-medium text-[#808080]">
                      Monday - Friday:
                    </span>
                    <br />
                    9:00 AM - 6:00 PM
                  </p>
                  <p className="text-[#808080]/80">
                    <span className="font-medium text-[#808080]">
                      Saturday:
                    </span>
                    <br />
                    9:00 AM - 1:00 PM
                  </p>
                  <p className="text-[#808080]/80">
                    <span className="font-medium text-[#808080]">Sunday:</span>
                    <br />
                    Closed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;
