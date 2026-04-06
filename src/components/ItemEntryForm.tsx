import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { CAR_DATA, CAR_MAKES } from "../data/carData";
import { getFuelPrice, DEFAULT_MPG } from "../lib/costConfig";
import { decodeVin } from "../lib/vinLookup";
import { getEpaMpg } from "../lib/epaData";
import { useState } from "react";

// ── US States ──────────────────────────────────────────────────────────────

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
];

// ── Schema ─────────────────────────────────────────────────────────────────

const carSchema = z.object({
  category: z.literal("car"),

  // Vehicle identity
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.number({ invalid_type_error: "Year must be a number" })
    .int().min(1886).max(new Date().getFullYear() + 1, "Year is too far in the future"),
  fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid"], {
    errorMap: () => ({ message: "Select a fuel type" }),
  }),
  state: z.string().min(2, "Select a state"),

  // Driving
  annualMileage: z.number({ invalid_type_error: "Required" }).positive("Must be positive"),
  mpg: z.number({ invalid_type_error: "Required" }).positive("Must be positive"),
  fuelPricePerUnit: z.number({ invalid_type_error: "Required" }).positive("Must be positive"),

  // Purchase & financing
  purchasePrice: z.number({ invalid_type_error: "Required" }).nonnegative(),
  downPayment: z.number({ invalid_type_error: "Required" }).nonnegative(),
  loanAmount: z.number({ invalid_type_error: "Required" }).nonnegative(),
  loanInterestRate: z.number({ invalid_type_error: "Required" }).min(0).max(50),
  loanTermMonths: z.number({ invalid_type_error: "Required" }).int().min(0).max(120),

  // Recurring costs
  insuranceMonthly: z.number({ invalid_type_error: "Required" }).nonnegative(),
  registrationAnnual: z.number({ invalid_type_error: "Required" }).nonnegative(),
  parkingMonthly: z.number({ invalid_type_error: "Required" }).nonnegative(),
});

// Keep a thin pet schema for backwards-compat with saved analyses
const petSchema = z.object({
  category: z.literal("pet"),
  petType: z.enum(["dog", "cat", "bird", "other"]),
  breed: z.string().min(1),
  ageYears: z.number().nonnegative().max(50),
  size: z.enum(["small", "medium", "large"]),
  purchasePrice: z.number().nonnegative(),
  monthlyExpenses: z.number().nonnegative(),
  // legacy compat fields
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid"]).optional(),
  annualMileage: z.number().optional(),
  state: z.string().optional(),
  mpg: z.number().optional(),
  fuelPricePerUnit: z.number().optional(),
  downPayment: z.number().optional(),
  loanAmount: z.number().optional(),
  loanInterestRate: z.number().optional(),
  loanTermMonths: z.number().optional(),
  insuranceMonthly: z.number().optional(),
  registrationAnnual: z.number().optional(),
  parkingMonthly: z.number().optional(),
});

const schema = z.discriminatedUnion("category", [carSchema, petSchema]);

export type CarFormData = z.infer<typeof carSchema>;
export type ItemFormData = z.infer<typeof schema>;

// ── Helpers ────────────────────────────────────────────────────────────────

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-destructive mt-0.5">{msg}</p> : null;
}

// ── Component ──────────────────────────────────────────────────────────────

interface ItemEntryFormProps {
  onSubmit: (data: ItemFormData) => void;
  defaultValues?: Partial<CarFormData>;
}

export function ItemEntryForm({ onSubmit, defaultValues }: ItemEntryFormProps) {
  const [section, setSection] = useState<"vehicle" | "financing" | "running">("vehicle");
  const [vinInput, setVinInput] = useState("");
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState<string | null>(null);
  const [epaLoading, setEpaLoading] = useState(false);
  const [epaMpgInfo, setEpaMpgInfo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CarFormData>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      category: "car",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      fuelType: "gasoline",
      state: "TX",
      annualMileage: 12000,
      mpg: 28,
      fuelPricePerUnit: 3.45,
      purchasePrice: 0,
      downPayment: 0,
      loanAmount: 0,
      loanInterestRate: 6.5,
      loanTermMonths: 60,
      insuranceMonthly: 150,
      registrationAnnual: 250,
      parkingMonthly: 0,
      ...defaultValues,
    },
  });

  const selectedMake = useWatch({ control, name: "make" });
  const fuelType = watch("fuelType");
  const state = watch("state");
  const purchasePrice = watch("purchasePrice");

  const handleVinLookup = async () => {
    setVinLoading(true);
    setVinError(null);
    const result = await decodeVin(vinInput);
    setVinLoading(false);
    if (result.error) { setVinError(result.error); return; }
    if (result.make) setValue("make", result.make);
    if (result.model) setValue("model", result.model);
    if (result.year) setValue("year", result.year);
    setValue("fuelType", result.fuelType);
    syncFuelPrice(result.fuelType);
    setEpaMpgInfo(null);
  };

  const handleEpaLookup = async () => {
    const make = watch("make");
    const model = watch("model");
    const year = watch("year");
    if (!make || !model || !year) return;
    setEpaLoading(true);
    setEpaMpgInfo(null);
    const result = await getEpaMpg(year, make, model);
    setEpaLoading(false);
    if (result) {
      setValue("mpg", result.combined);
      setEpaMpgInfo(`City ${result.city} / Hwy ${result.highway} / Combined ${result.combined}`);
    } else {
      setEpaMpgInfo("No EPA data found — enter manually.");
    }
  };

  // Auto-update fuel price when state or fuel type changes
  const syncFuelPrice = (newFuel?: string, newState?: string) => {
    const f = newFuel ?? fuelType;
    const s = newState ?? state;
    setValue("fuelPricePerUnit", getFuelPrice(f, s));
    setValue("mpg", DEFAULT_MPG[f] ?? 28);
  };

  const tabs = [
    { id: "vehicle", label: "Vehicle" },
    { id: "financing", label: "Financing" },
    { id: "running", label: "Running Costs" },
  ] as const;

  const carErrors = errors as Partial<Record<keyof CarFormData, { message?: string }>>;

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Vehicle Cost Calculator</CardTitle>
        <p className="text-sm text-muted-foreground">Enter your vehicle details to calculate total ownership cost.</p>
      </CardHeader>
      <CardContent>
        {/* Section tabs */}
        <div className="flex gap-1 mb-6 border-b pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSection(t.id)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                section === t.id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit((d) => onSubmit(d as ItemFormData))} noValidate className="space-y-4">

          {/* ── Vehicle section ── */}
          {section === "vehicle" && (
            <>
              {/* VIN auto-fill */}
              <div className="space-y-1">
                <Label>VIN <span className="text-muted-foreground font-normal">(optional — auto-fills vehicle details)</span></Label>
                <div className="flex gap-2">
                  <Input
                    value={vinInput}
                    onChange={(e) => { setVinInput(e.target.value.toUpperCase()); setVinError(null); }}
                    placeholder="17-character VIN"
                    maxLength={17}
                    className="font-mono flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVinLookup}
                    disabled={vinInput.length !== 17 || vinLoading}
                    className="whitespace-nowrap"
                  >
                    {vinLoading ? "Looking up…" : "Auto-fill"}
                  </Button>
                </div>
                {vinError && <p className="text-xs text-destructive">{vinError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Make</Label>
                  <Controller
                    name="make"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        onChange={(e) => { field.onChange(e); setValue("model", ""); }}
                        className={selectCls}
                      >
                        <option value="">Select make</option>
                        {CAR_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    )}
                  />
                  <FieldError msg={carErrors.make?.message} />
                </div>
                <div className="space-y-1">
                  <Label>Model</Label>
                  <Controller
                    name="model"
                    control={control}
                    render={({ field }) => (
                      <select {...field} disabled={!selectedMake} className={selectCls}>
                        <option value="">{selectedMake ? "Select model" : "Select make first"}</option>
                        {(CAR_DATA[selectedMake ?? ""] ?? []).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    )}
                  />
                  <FieldError msg={carErrors.model?.message} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Year</Label>
                  <Input type="number" {...register("year", { valueAsNumber: true })} placeholder="2022" />
                  <FieldError msg={carErrors.year?.message} />
                </div>
                <div className="space-y-1">
                  <Label>Fuel Type</Label>
                  <Controller
                    name="fuelType"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        onChange={(e) => { field.onChange(e); syncFuelPrice(e.target.value); }}
                        className={selectCls}
                      >
                        <option value="gasoline">Gasoline</option>
                        <option value="diesel">Diesel</option>
                        <option value="electric">Electric</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>State</Label>
                  <Controller
                    name="state"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        onChange={(e) => { field.onChange(e); syncFuelPrice(undefined, e.target.value); }}
                        className={selectCls}
                      >
                        {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                  />
                  <FieldError msg={carErrors.state?.message} />
                </div>
                <div className="space-y-1">
                  <Label>Annual Mileage</Label>
                  <Input type="number" {...register("annualMileage", { valueAsNumber: true })} placeholder="12000" />
                  <FieldError msg={carErrors.annualMileage?.message} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{fuelType === "electric" ? "Efficiency (mi/kWh)" : "Fuel Economy (MPG)"}</Label>
                  <div className="flex gap-2">
                    <Input type="number" step="0.1" {...register("mpg", { valueAsNumber: true })} className="flex-1" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleEpaLookup}
                      disabled={epaLoading || !watch("make") || !watch("model")}
                      className="whitespace-nowrap px-2 text-xs"
                    >
                      {epaLoading ? "…" : "EPA"}
                    </Button>
                  </div>
                  {epaMpgInfo && <p className="text-xs text-muted-foreground">{epaMpgInfo}</p>}
                  <FieldError msg={carErrors.mpg?.message} />
                </div>
                <div className="space-y-1">
                  <Label>{fuelType === "electric" ? "Electricity ($/kWh)" : "Fuel Price ($/gal)"}</Label>
                  <Input type="number" step="0.01" {...register("fuelPricePerUnit", { valueAsNumber: true })} />
                  <FieldError msg={carErrors.fuelPricePerUnit?.message} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Purchase Price ($)</Label>
                <Input
                  type="number"
                  {...register("purchasePrice", {
                    valueAsNumber: true,
                    onChange: (e) => {
                      const val = parseFloat(e.target.value) || 0;
                      const down = watch("downPayment") || 0;
                      setValue("loanAmount", Math.max(0, val - down));
                    },
                  })}
                  placeholder="30000"
                />
                <FieldError msg={carErrors.purchasePrice?.message} />
              </div>
            </>
          )}

          {/* ── Financing section ── */}
          {section === "financing" && (
            <>
              <div className="rounded-md bg-muted/40 px-4 py-2 text-sm text-muted-foreground mb-2">
                Purchase price: <span className="font-medium text-foreground">${purchasePrice?.toLocaleString() ?? 0}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Down Payment ($)</Label>
                  <Input
                    type="number"
                    {...register("downPayment", {
                      valueAsNumber: true,
                      onChange: (e) => {
                        const down = parseFloat(e.target.value) || 0;
                        const price = watch("purchasePrice") || 0;
                        setValue("loanAmount", Math.max(0, price - down));
                      },
                    })}
                    placeholder="5000"
                  />
                  <FieldError msg={carErrors.downPayment?.message} />
                </div>
                <div className="space-y-1">
                  <Label>Loan Amount ($)</Label>
                  <Input type="number" {...register("loanAmount", { valueAsNumber: true })} />
                  <FieldError msg={carErrors.loanAmount?.message} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Interest Rate (% APR)</Label>
                  <Input type="number" step="0.1" {...register("loanInterestRate", { valueAsNumber: true })} placeholder="6.5" />
                  <FieldError msg={carErrors.loanInterestRate?.message} />
                </div>
                <div className="space-y-1">
                  <Label>Loan Term (months)</Label>
                  <Controller
                    name="loanTermMonths"
                    control={control}
                    render={({ field }) => (
                      <select {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} className={selectCls}>
                        <option value={0}>Paid in full / cash</option>
                        <option value={24}>24 months (2 yr)</option>
                        <option value={36}>36 months (3 yr)</option>
                        <option value={48}>48 months (4 yr)</option>
                        <option value={60}>60 months (5 yr)</option>
                        <option value={72}>72 months (6 yr)</option>
                        <option value={84}>84 months (7 yr)</option>
                      </select>
                    )}
                  />
                  <FieldError msg={carErrors.loanTermMonths?.message} />
                </div>
              </div>
            </>
          )}

          {/* ── Running costs section ── */}
          {section === "running" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Insurance ($/month)</Label>
                  <Input type="number" {...register("insuranceMonthly", { valueAsNumber: true })} placeholder="150" />
                  <FieldError msg={carErrors.insuranceMonthly?.message} />
                </div>
                <div className="space-y-1">
                  <Label>Registration & Taxes ($/year)</Label>
                  <Input type="number" {...register("registrationAnnual", { valueAsNumber: true })} placeholder="250" />
                  <FieldError msg={carErrors.registrationAnnual?.message} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Parking & Tolls ($/month)</Label>
                <Input type="number" {...register("parkingMonthly", { valueAsNumber: true })} placeholder="0" />
                <FieldError msg={carErrors.parkingMonthly?.message} />
              </div>

              <p className="text-xs text-muted-foreground">
                Maintenance cost is estimated automatically based on vehicle age. You can log actual expenses after calculating.
              </p>
            </>
          )}

          <div className="flex gap-2 pt-2">
            {section !== "vehicle" && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setSection(section === "running" ? "financing" : "vehicle")}
              >
                Back
              </Button>
            )}
            {section !== "running" ? (
              <Button
                type="button"
                className="flex-1"
                onClick={() => setSection(section === "vehicle" ? "financing" : "running")}
              >
                Next
              </Button>
            ) : (
              <Button type="submit" className="flex-1">
                Calculate Costs
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
