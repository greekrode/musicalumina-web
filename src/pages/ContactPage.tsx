import { Mail, Phone, MapPin } from 'lucide-react';

function ContactPage() {
  return (
    <div className="pt-20 pb-12 bg-[#FFFFF0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-playfair text-[#808080] mb-4">Contact Us</h1>
          <p className="text-lg text-[#808080]/80 max-w-2xl mx-auto">
            Have questions about our competitions or programs? We'd love to hear from you.
            Get in touch with our team for more information.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-playfair text-[#808080] mb-6">Send Us a Message</h2>
            <form className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#808080] mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-4 py-2 rounded-md border border-[#CFB53B]/20 focus:outline-none focus:ring-2 focus:ring-[#CFB53B]/50"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#808080] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-2 rounded-md border border-[#CFB53B]/20 focus:outline-none focus:ring-2 focus:ring-[#CFB53B]/50"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-[#808080] mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  className="w-full px-4 py-2 rounded-md border border-[#CFB53B]/20 focus:outline-none focus:ring-2 focus:ring-[#CFB53B]/50"
                  placeholder="Competition Inquiry"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-[#808080] mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full px-4 py-2 rounded-md border border-[#CFB53B]/20 focus:outline-none focus:ring-2 focus:ring-[#CFB53B]/50"
                  placeholder="Your message here..."
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-[#CFB53B] text-white px-6 py-3 rounded-md hover:bg-[#CFB53B]/90 transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>

          <div className="space-y-8">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-playfair text-[#808080] mb-6">Contact Information</h2>
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
                    <p className="text-[#808080]/80">
                      Jakarta, Indonesia
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h2 className="text-2xl font-playfair text-[#808080] mb-6">Office Hours</h2>
              <div className="space-y-2">
                <p className="text-[#808080]/80">
                  <span className="font-medium text-[#808080]">Monday - Friday:</span><br />
                  9:00 AM - 5:00 PM
                </p>
                <p className="text-[#808080]/80">
                  <span className="font-medium text-[#808080]">Saturday:</span><br />
                  9:00 AM - 1:00 PM
                </p>
                <p className="text-[#808080]/80">
                  <span className="font-medium text-[#808080]">Sunday:</span><br />
                  Closed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactPage;