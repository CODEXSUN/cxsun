import { useState, type FormEvent } from "react";
import { Button } from "@cxsun/ui/components/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@cxsun/ui/components/dialog";
import { Input } from "@cxsun/ui/components/input";
import { RadioGroup, RadioGroupItem } from "@cxsun/ui/components/radio-group";
import type { FrappeUserPreview } from "./user-sync.types";

export function FrappeUserImportForm({
  user,
  pending,
  onCancel,
  onSubmit
}: {
  user: FrappeUserPreview;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (password?: string) => void;
}) {
  const [mode, setMode] = useState<"generated" | "custom">("generated");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const validCustomPassword =
    password.length >= 8 &&
    password.length <= 128 &&
    password === password.trim() &&
    password === confirmation;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || (mode === "custom" && !validCustomPassword)) return;
    onSubmit(mode === "custom" ? password : undefined);
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add {user.name}</DialogTitle>
        <DialogDescription>
          Create a local application account for {user.email}. Choose the password for this account.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-5">
        <RadioGroup
          value={mode}
          onValueChange={(value) => setMode(value as "generated" | "custom")}
          className="space-y-2"
          aria-label="Password option"
        >
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <RadioGroupItem value="generated" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">Generate a temporary password</span>
              <span className="block text-xs text-muted-foreground">
                Shown once after the user is added.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3">
            <RadioGroupItem value="custom" className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">Set a custom password</span>
              <span className="block text-xs text-muted-foreground">
                Use a password you choose for this local account.
              </span>
            </span>
          </label>
        </RadioGroup>
        {mode === "custom" ? (
          <div className="space-y-3">
            <label className="block space-y-1 text-sm font-medium">
              <span>Custom password</span>
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                required
              />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>Confirm password</span>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Use 8 to 128 characters, with no spaces at the start or end.
            </p>
            {confirmation && password !== confirmation ? (
              <p role="alert" className="text-xs text-destructive">
                Passwords do not match.
              </p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || (mode === "custom" && !validCustomPassword)}>
            {pending ? "Adding…" : "Add user"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
