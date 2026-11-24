import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ApiError } from "@/lib/api";
import { useFocusFirstInvalid, useSignUp } from "./hooks";
import { AccountDetailsView, type SignUpState } from "./views/AccountDetailsView";
import { RoleStepView } from "./views/RoleStepView";
import type { SignUpRole } from "./views/roles";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = { email?: string; password?: string };

function validate(email: string, password: string): Errors {
  const errors: Errors = {};
  if (!EMAIL_RE.test(email)) errors.email = "Enter an email like you@university.edu";
  if (password.length < 8 || password.length > 64) errors.password = "Use 8 to 64 characters";
  return errors;
}

/** Navigation state is untrusted (reload, forged history, links from elsewhere): accept only the two known roles and a short string. */
function readNavState(raw: unknown): { role?: SignUpRole; email: string } {
  const state = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const role = state.role === "student" || state.role === "employer" ? state.role : undefined;
  const email = typeof state.email === "string" && state.email.length <= 254 ? state.email : "";
  return { role, email };
}

/**
 * 005 S2 + S3 - Sign up in two steps on one address (research R1). A role in navigation state shows the details step,
 * otherwise the role step. Continue pushes `{ role, email }`; the password never enters history. Role step -> Back keeps
 * the last role and email in page state, so browser Back and Forward both find what was typed. Submit -> verify with
 * `{email, resendIn, role}` in navigation state.
 */
export function SignUpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const nav = readNavState(location.state);
  const signUp = useSignUp();
  const [state, setState] = useState<SignUpState>("default");
  const [errors, setErrors] = useState<Errors>({});
  // what the user last typed / chose; survives Back and Forward while this page stays mounted
  const [email, setEmail] = useState(nav.email);
  const [lastRole, setLastRole] = useState<SignUpRole | undefined>(nav.role);
  const inFlight = useRef(false);

  // each step starts clean: an error of one step or role must not follow the user to the other
  const stepKey = nav.role ? `details:${nav.role}` : "role";
  const [seenStep, setSeenStep] = useState(stepKey);
  if (seenStep !== stepKey) {
    setSeenStep(stepKey);
    setState("default");
    setErrors({});
    if (nav.role) setLastRole(nav.role);
  }

  // A response that arrives after the user left this step (Change role, browser Back) or this page must be dropped:
  // the cleanup runs on a step change and on unmount (also StrictMode's mount/unmount/mount, where nothing is in flight yet).
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current += 1;
      inFlight.current = false;
    },
    [stepKey],
  );

  const markSubmit = useFocusFirstInvalid(state === "field-errors" || state === "email-taken");

  if (!nav.role) {
    return (
      <RoleStepView
        key="role"
        state="default"
        role={lastRole}
        onContinue={(role) => {
          setLastRole(role);
          navigate("/sign-up", { state: { role, email } });
        }}
      />
    );
  }

  const role = nav.role;

  const onSubmit = async (values: { email: string; password: string }) => {
    if (inFlight.current) return;
    markSubmit();
    const cleanEmail = values.email.trim();
    setEmail(cleanEmail);
    // keep role and email in this history entry, so Back from the code page returns to the filled details step
    navigate("/sign-up", { replace: true, state: { role, email: cleanEmail } });
    const invalid = validate(cleanEmail, values.password);
    if (invalid.email || invalid.password) {
      setErrors(invalid);
      setState("field-errors");
      return;
    }
    setErrors({});
    setState("submitting");
    inFlight.current = true;
    const mine = generation.current;
    try {
      const sent = await signUp.mutateAsync({ email: cleanEmail, password: values.password, role });
      if (mine !== generation.current) return;
      navigate("/sign-up/verify", { state: { email: sent.email, resendIn: sent.resend_in, role } });
    } catch (error) {
      if (mine !== generation.current) return;
      if (error instanceof ApiError) {
        if (error.code === "email_taken") return setState("email-taken");
        if (error.code === "resend_too_soon") {
          // a code for this email was sent less than a minute ago: go and enter it
          return navigate("/sign-up/verify", {
            state: { email: cleanEmail, resendIn: error.retryAfter ?? 60, role, cooldown: true },
          });
        }
        if (error.status === 422) {
          setErrors({ password: "Use 8 to 64 characters" });
          return setState("field-errors");
        }
      }
      setState("server-error");
    } finally {
      if (mine === generation.current) inFlight.current = false;
    }
  };

  return (
    <AccountDetailsView
      key={stepKey}
      state={state}
      role={role}
      email={email}
      errors={errors}
      onSubmit={onSubmit}
      onEmailChange={setEmail}
      // password is not carried; the typed email travels back and forth in page state and history
      onChangeRole={(typed) => {
        setEmail(typed);
        navigate("/sign-up", { state: { email: typed } });
      }}
    />
  );
}
