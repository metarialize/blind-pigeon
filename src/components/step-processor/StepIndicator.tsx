
import { steps } from "@/constants/step-processor";

interface StepIndicatorProps {
  currentStep: number;
  getStepStatus: (step: number) => 'success' | 'warning' | 'error' | undefined;
}

export function StepIndicator({ currentStep, getStepStatus }: StepIndicatorProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, idx) => (
          <div 
            key={idx} 
            className={`flex-1 ${idx !== steps.length - 1 ? 'mr-4' : ''}`}
          >
            <div className="relative">
              <div className="flex items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    idx === currentStep 
                      ? 'bg-primary text-primary-foreground ring-2 ring-offset-2 ring-primary'
                      : idx < currentStep
                      ? 'bg-primary/80 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {idx + 1}
                </div>
                {idx !== steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        idx < currentStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  </div>
                )}
              </div>
              <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap ${
                idx === currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}>
                {step.title}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-12 text-center space-y-2">
        <h2 className="text-lg font-medium text-gray-900">
          {steps[currentStep].title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {steps[currentStep].description}
        </p>
        {currentStep > 0 && (
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
            getStepStatus(currentStep) === 'success'
              ? 'bg-green-50 text-green-700'
              : getStepStatus(currentStep) === 'warning'
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-red-50 text-red-700'
          }`}>
            <span className="mr-2">
              {getStepStatus(currentStep) === 'success' ? '✅' : 
               getStepStatus(currentStep) === 'warning' ? '⚠️' : '❌'}
            </span>
            {steps[currentStep].validationMessage[getStepStatus(currentStep) || 'warning']}
          </div>
        )}
      </div>
    </div>
  );
}
