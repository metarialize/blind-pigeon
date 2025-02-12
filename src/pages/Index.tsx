
import { TextProcessor } from "@/components/TextProcessor";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12 animate-slide-in">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4">
            Blind Pigeon
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Securely process sensitive text with automated masking and restoration.
            All processing happens offline, ensuring your data stays private.
          </p>
        </div>
        
        <TextProcessor />
      </div>
    </div>
  );
};

export default Index;
