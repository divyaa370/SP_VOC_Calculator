import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../context/AuthContext";
import { getUserProfile, saveUserProfile } from "../../lib/auth";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

// ── US States ──────────────────────────────────────────────────────────────

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

// ── Schema ─────────────────────────────────────────────────────────────────

const num = (min = 0) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(min).optional()
  );

const profileSchema = z.object({
  displayName: z.string().max(100).optional(),
  annualIncome: num(0),
  homeAddress: z.string().max(200).optional(),
  workAddress: z.string().max(200).optional(),
  commuteDaysPerWeek: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(1).max(7).optional()
  ),
  oneWayCommuteMiles: num(0),
  preferredFuelPrice: num(0),
  electricityRate: num(0),
  drivingStyle: z.enum(["city", "mixed", "highway"]).optional(),
  monthlyInsurancePremium: num(0),
  stateOfRegistration: z.string().optional(),
  ownershipHorizonYears: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(1).max(15).optional()
  ),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ── Styles ─────────────────────────────────────────────────────────────────

const inputCls = "bg-[#2a2a5a] border-white/15 text-white placeholder:text-gray-500 focus-visible:ring-[#00d4ff]";
const selectCls =
  "flex h-9 w-full rounded-md border px-3 py-1 text-sm bg-[#2a2a5a] text-white border-white/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00d4ff] disabled:opacity-50";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 pt-2 pb-1 border-b border-white/10 mb-1">
      {children}
    </p>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function UserProfileForm() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const existing = user?.id ? getUserProfile(user.id) : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: existing?.displayName ?? "",
      annualIncome: existing?.annualIncome,
      homeAddress: existing?.homeAddress ?? "",
      workAddress: existing?.workAddress ?? "",
      commuteDaysPerWeek: existing?.commuteDaysPerWeek,
      oneWayCommuteMiles: existing?.oneWayCommuteMiles,
      preferredFuelPrice: existing?.preferredFuelPrice,
      electricityRate: existing?.electricityRate,
      drivingStyle: existing?.drivingStyle,
      monthlyInsurancePremium: existing?.monthlyInsurancePremium,
      stateOfRegistration: existing?.stateOfRegistration ?? "",
      ownershipHorizonYears: existing?.ownershipHorizonYears,
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    if (!user?.id) return;
    saveUserProfile(user.id, data);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const err = errors as Partial<Record<keyof ProfileFormData, { message?: string }>>;

  return (
    <div
      className="w-full max-w-xl rounded-2xl border p-6 space-y-4"
      style={{ backgroundColor: "#1e1e3f", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div>
        <h3 className="text-base font-semibold text-white">Profile</h3>
        <p className="text-sm text-gray-400 mt-0.5">
          Optional — fills in calculator defaults automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

        <SectionHeading>Identity</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm text-gray-300">Display name</Label>
            <Input placeholder="Jane Smith" {...register("displayName")} className={inputCls} />
            {err.displayName && <p className="text-xs text-red-400">{err.displayName.message}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-gray-300">Annual gross income (USD)</Label>
            <Input type="number" placeholder="75000" {...register("annualIncome")} className={inputCls} />
            {err.annualIncome && <p className="text-xs text-red-400">{err.annualIncome.message}</p>}
          </div>
        </div>

        <SectionHeading>Commute</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm text-gray-300">Home address or zip</Label>
            <Input placeholder="78701" {...register("homeAddress")} className={inputCls} />
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-gray-300">Work address or zip</Label>
            <Input placeholder="78703" {...register("workAddress")} className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm text-gray-300">Commute days per week</Label>
            <Input type="number" min={1} max={7} placeholder="5" {...register("commuteDaysPerWeek")} className={inputCls} />
            {err.commuteDaysPerWeek && <p className="text-xs text-red-400">{err.commuteDaysPerWeek.message}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-gray-300">One-way commute distance (miles)</Label>
            <Input type="number" step="0.1" placeholder="12.5" {...register("oneWayCommuteMiles")} className={inputCls} />
            <p className="text-xs text-gray-500">Auto-fills annual mileage in calculator</p>
          </div>
        </div>

        <SectionHeading>Fuel &amp; Driving Preferences</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm text-gray-300">Preferred fuel price ($/gal)</Label>
            <Input type="number" step="0.01" placeholder="3.45" {...register("preferredFuelPrice")} className={inputCls} />
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-gray-300">Electricity rate ($/kWh)</Label>
            <Input type="number" step="0.001" placeholder="0.16" {...register("electricityRate")} className={inputCls} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-sm text-gray-300">Typical driving style</Label>
          <select className={selectCls} {...register("drivingStyle")}>
            <option value="">Not specified</option>
            <option value="city">City-heavy (lots of stop-and-go)</option>
            <option value="mixed">Mixed</option>
            <option value="highway">Highway-heavy (mostly open road)</option>
          </select>
        </div>

        <SectionHeading>Insurance</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm text-gray-300">Current monthly premium (USD)</Label>
            <Input type="number" placeholder="150" {...register("monthlyInsurancePremium")} className={inputCls} />
            <p className="text-xs text-gray-500">Pre-fills insurance in cost calc</p>
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-gray-300">State of registration</Label>
            <select className={selectCls} {...register("stateOfRegistration")}>
              <option value="">Select state</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <SectionHeading>Vehicle Defaults</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm text-gray-300">Ownership horizon (years)</Label>
            <Input type="number" min={1} max={15} placeholder="5" {...register("ownershipHorizonYears")} className={inputCls} />
            {err.ownershipHorizonYears && <p className="text-xs text-red-400">{err.ownershipHorizonYears.message}</p>}
            <p className="text-xs text-gray-500">Sets default projection length</p>
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-gray-300">Currency display</Label>
            <select className={selectCls} disabled>
              <option>USD ($)</option>
            </select>
            <p className="text-xs text-gray-500">Additional currencies coming soon</p>
          </div>
        </div>

        {saved && <p className="text-sm text-green-400">Profile saved</p>}

        <button
          type="submit"
          className="w-full py-2 rounded-lg text-sm font-semibold transition-opacity"
          style={{ background: "linear-gradient(90deg, #00d4ff, #7c3aed)", color: "#fff" }}
        >
          Save profile
        </button>
      </form>
    </div>
  );
}
