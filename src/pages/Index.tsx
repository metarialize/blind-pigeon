
import { StepProcessor } from "@/components/StepProcessor";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12 animate-slide-in">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4">
            Blind Pigeon
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            AI-Safe Text Protection
          </p>
          <p className="text-sm text-gray-500 mt-2 max-w-2xl mx-auto">
            Protect your sensitive information when using AI tools like ChatGPT, Claude, or XAI, etc. by automatically redacting and restoring private data—all processed locally for maximum privacy.
          </p>
        </div>
        
        <StepProcessor />
      </div>
    </div>
  );
};

export default Index;
