import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../context/AuthContext";
import { getUserProfile, saveUserProfile } from "../../lib/auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

// ── US States ──────────────────────────────────────────────────────────────

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

// ── Schema ─────────────────────────────────────────────────────────────────

// All number fields come in as strings from inputs; we coerce then allow undefined.
const num = (min = 0) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(min).optional()
  );

const profileSchema = z.object({
  // Identity
  displayName: z.string().max(100).optional(),
  annualIncome: num(0),
  // Commute
  homeAddress: z.string().max(200).optional(),
  workAddress: z.string().max(200).optional(),
  commuteDaysPerWeek: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(1).max(7).optional()
  ),
  oneWayCommuteMiles: num(0),
  // Fuel & driving
  preferredFuelPrice: num(0),
  electricityRate: num(0),
  drivingStyle: z.enum(["city", "mixed", "highway"]).optional(),
  // Insurance
  monthlyInsurancePremium: num(0),
  stateOfRegistration: z.string().optional(),
  // Vehicle defaults
  ownershipHorizonYears: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(1).max(15).optional()
  ),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2 pb-1 border-b mb-1">
      {children}
    </p>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function UserProfileForm() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  // Load existing profile as default values
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
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <p className="text-sm text-muted-foreground">
          Optional — fills in calculator defaults automatically.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">

          {/* ── Identity ── */}
          <SectionHeading>Identity</SectionHeading>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Display name</Label>
              <Input placeholder="Jane Smith" {...register("displayName")} />
              {err.displayName && <p className="text-xs text-destructive">{err.displayName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Annual gross income (USD)</Label>
              <Input
                type="number"
                placeholder="75000"
                {...register("annualIncome")}
              />
              {err.annualIncome && <p className="text-xs text-destructive">{err.annualIncome.message}</p>}
            </div>
          </div>

          {/* ── Commute ── */}
          <SectionHeading>Commute</SectionHeading>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Home address or zip</Label>
              <Input placeholder="78701" {...register("homeAddress")} />
            </div>
            <div className="space-y-1">
              <Label>Work address or zip</Label>
              <Input placeholder="78703" {...register("workAddress")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Commute days per week</Label>
              <Input
                type="number"
                min={1}
                max={7}
                placeholder="5"
                {...register("commuteDaysPerWeek")}
              />
              {err.commuteDaysPerWeek && <p className="text-xs text-destructive">{err.commuteDaysPerWeek.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>One-way commute distance (miles)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="12.5"
                {...register("oneWayCommuteMiles")}
              />
              <p className="text-xs text-muted-foreground">Auto-fills annual mileage in calculator</p>
            </div>
          </div>

          {/* ── Fuel & Driving ── */}
          <SectionHeading>Fuel &amp; Driving Preferences</SectionHeading>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Preferred fuel price ($/gal)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="3.45"
                {...register("preferredFuelPrice")}
              />
            </div>
            <div className="space-y-1">
              <Label>Electricity rate ($/kWh)</Label>
              <Input
                type="number"
                step="0.001"
                placeholder="0.16"
                {...register("electricityRate")}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Typical driving style</Label>
            <select className={selectCls} {...register("drivingStyle")}>
              <option value="">Not specified</option>
              <option value="city">City-heavy (lots of stop-and-go)</option>
              <option value="mixed">Mixed</option>
              <option value="highway">Highway-heavy (mostly open road)</option>
            </select>
          </div>

          {/* ── Insurance ── */}
          <SectionHeading>Insurance</SectionHeading>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Current monthly premium (USD)</Label>
              <Input
                type="number"
                placeholder="150"
                {...register("monthlyInsurancePremium")}
              />
              <p className="text-xs text-muted-foreground">Pre-fills insurance in cost calc</p>
            </div>
            <div className="space-y-1">
              <Label>State of registration</Label>
              <select className={selectCls} {...register("stateOfRegistration")}>
                <option value="">Select state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Vehicle Defaults ── */}
          <SectionHeading>Vehicle Defaults</SectionHeading>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Ownership horizon (years)</Label>
              <Input
                type="number"
                min={1}
                max={15}
                placeholder="5"
                {...register("ownershipHorizonYears")}
              />
              {err.ownershipHorizonYears && <p className="text-xs text-destructive">{err.ownershipHorizonYears.message}</p>}
              <p className="text-xs text-muted-foreground">Sets default projection length</p>
            </div>
            <div className="space-y-1">
              <Label>Currency display</Label>
              <select className={selectCls} disabled>
                <option>USD ($)</option>
              </select>
              <p className="text-xs text-muted-foreground">Additional currencies coming soon</p>
            </div>
          </div>

          {saved && (
            <p className="text-sm text-green-600">Profile saved</p>
          )}

          <Button type="submit" className="w-full">
            Save profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
