import { useMemo } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface PasswordRule {
  id: string;
  label: string;
  validator: (password: string, context?: PasswordContext) => boolean;
}

interface PasswordContext {
  email?: string;
  username?: string;
}

interface PasswordValidatorProps {
  password: string;
  confirmPassword?: string;
  email?: string;
  username?: string;
  showStrengthMeter?: boolean;
  className?: string;
}

const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "minLength",
    label: "At least 8 characters",
    validator: (password) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "At least 1 uppercase letter (A-Z)",
    validator: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "At least 1 lowercase letter (a-z)",
    validator: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "At least 1 number (0-9)",
    validator: (password) => /[0-9]/.test(password),
  },
  {
    id: "special",
    label: "At least 1 special character (!@#$%^&*)",
    validator: (password) => /[!@#$%^&*]/.test(password),
  },
  {
    id: "noEmailMatch",
    label: "Password must not contain email",
    validator: (password, context) => {
      if (!context?.email || !password) return true;
      const emailPart = context.email.split("@")[0].toLowerCase();
      return !password.toLowerCase().includes(emailPart);
    },
  },
];

export function validatePassword(
  password: string,
  context?: PasswordContext
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Trim the password
  const trimmedPassword = password.trim();
  
  PASSWORD_RULES.forEach((rule) => {
    if (!rule.validator(trimmedPassword, context)) {
      errors.push(rule.label);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getPasswordStrength(password: string): {
  score: number;
  label: "Weak" | "Medium" | "Strong";
  color: string;
} {
  if (!password) {
    return { score: 0, label: "Weak", color: "bg-destructive" };
  }

  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9!@#$%^&*]/.test(password)) score += 1;

  // Determine strength level
  if (score <= 3) {
    return { score: 33, label: "Weak", color: "bg-destructive" };
  } else if (score <= 5) {
    return { score: 66, label: "Medium", color: "bg-warning" };
  } else {
    return { score: 100, label: "Strong", color: "bg-success" };
  }
}

export default function PasswordValidator({
  password,
  confirmPassword,
  email,
  username,
  showStrengthMeter = true,
  className,
}: PasswordValidatorProps) {
  const context = useMemo(() => ({ email, username }), [email, username]);
  
  const validation = useMemo(
    () => validatePassword(password, context),
    [password, context]
  );

  const strength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const passwordsMatch = useMemo(() => {
    if (confirmPassword === undefined) return true;
    return password === confirmPassword && confirmPassword.length > 0;
  }, [password, confirmPassword]);

  const showConfirmCheck = confirmPassword !== undefined && confirmPassword.length > 0;

  if (!password) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Password Strength Meter */}
      {showStrengthMeter && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Password Strength</span>
            <span
              className={cn(
                "font-medium",
                strength.label === "Weak" && "text-destructive",
                strength.label === "Medium" && "text-warning",
                strength.label === "Strong" && "text-success"
              )}
            >
              {strength.label}
            </span>
          </div>
          <Progress
            value={strength.score}
            className="h-2"
            indicatorClassName={strength.color}
          />
        </div>
      )}

      {/* Validation Checklist */}
      <div className="space-y-1.5 rounded-lg border border-border/50 bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          Password Requirements
        </p>
        {PASSWORD_RULES.map((rule) => {
          const isPassed = rule.validator(password.trim(), context);
          return (
            <div
              key={rule.id}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors",
                isPassed ? "text-success" : "text-muted-foreground"
              )}
            >
              {isPassed ? (
                <Check className="h-4 w-4 flex-shrink-0" />
              ) : (
                <X className="h-4 w-4 flex-shrink-0" />
              )}
              <span className={isPassed ? "line-through opacity-60" : ""}>
                {rule.label}
              </span>
            </div>
          );
        })}

        {/* Confirm Password Match */}
        {showConfirmCheck && (
          <div
            className={cn(
              "flex items-center gap-2 text-sm transition-colors pt-2 border-t border-border/50 mt-2",
              passwordsMatch ? "text-success" : "text-destructive"
            )}
          >
            {passwordsMatch ? (
              <Check className="h-4 w-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
            )}
            <span>Passwords match</span>
          </div>
        )}
      </div>

      {/* Overall Status */}
      {!validation.isValid && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>Password does not meet security requirements</span>
        </div>
      )}
    </div>
  );
}

// Hook for easy validation checking
export function usePasswordValidation(
  password: string,
  confirmPassword?: string,
  context?: PasswordContext
) {
  const validation = useMemo(
    () => validatePassword(password, context),
    [password, context]
  );

  const passwordsMatch = useMemo(() => {
    if (confirmPassword === undefined) return true;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const isValid = validation.isValid && passwordsMatch;

  return {
    isValid,
    errors: validation.errors,
    passwordsMatch,
  };
}