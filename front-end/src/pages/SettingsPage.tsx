import { useState } from "react";
import { getUserId, setUserId } from "../lib/auth";

export default function SettingsPage() {
  const [name, setName] = useState(getUserId());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setUserId(name);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = () => {
    if (confirm("This will clear your stored profile name from local storage. Your data on the server remains intact. Continue?")) {
      localStorage.removeItem("elara_user_id");
      setName("me");
      setUserId("me");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl text-foreground">⚙️ Settings</h1>
        <p className="text-text-soft mt-1">Manage your profile and preferences.</p>
      </div>

      {/* Profile */}
      <section className="card">
        <h2 className="font-heading text-xl text-foreground mb-4">Profile</h2>
        <label className="flex flex-col gap-1 text-sm text-text-soft mb-4">
          Your name / profile ID
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="input-field"
          />
        </label>
        <button onClick={handleSave} className="btn-primary">
          {saved ? "✓ Saved!" : "Save"}
        </button>
      </section>

      {/* Data */}
      <section className="card">
        <h2 className="font-heading text-xl text-foreground mb-4">Data</h2>
        <p className="text-text-soft text-sm mb-4">
          Your cycle and mood data is stored on the server under your profile name.
          Clearing local storage only resets the locally cached name — your data stays safe.
        </p>
        <button onClick={handleClearData} className="btn-secondary border-destructive text-destructive hover:bg-red-50">
          Reset local profile
        </button>
      </section>

      {/* About */}
      <section className="card">
        <h2 className="font-heading text-xl text-foreground mb-2">About Elara AI</h2>
        <p className="text-text-soft text-sm leading-relaxed">
          Elara AI is a cycle intelligence and wellness platform designed for women.
          It combines cycle science with AI to help you track periods, log moods,
          and discover personalized insights about your body and emotional patterns.
        </p>
        <p className="text-text-soft text-xs mt-4">
          Version 2.0 · Built with React, Tailwind CSS, and FastAPI
        </p>
      </section>
    </div>
  );
}