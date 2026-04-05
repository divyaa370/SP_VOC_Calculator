import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { CAR_DATA, CAR_MAKES } from "../data/carData";

// ── Schemas ────────────────────────────────────────────────────────────────

const carSchema = z.object({
  category: z.literal("car"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z
    .number({ invalid_type_error: "Year must be a number" })
    .int()
    .min(1886, "Year must be 1886 or later")
    .max(new Date().getFullYear() + 1, "Year is too far in the future"),
  fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid"], {
    errorMap: () => ({ message: "Select a fuel type" }),
  }),
  annualMileage: z
    .number({ invalid_type_error: "Mileage must be a number" })
    .positive("Mileage must be positive"),
  purchasePrice: z
    .number({ invalid_type_error: "Price must be a number" })
    .nonnegative("Price cannot be negative"),
  monthlyExpenses: z
    .number({ invalid_type_error: "Expenses must be a number" })
    .nonnegative("Expenses cannot be negative"),
});

const petSchema = z.object({
  category: z.literal("pet"),
  petType: z.enum(["dog", "cat", "bird", "other"], {
    errorMap: () => ({ message: "Select a pet type" }),
  }),
  breed: z.string().min(1, "Breed is required"),
  ageYears: z
    .number({ invalid_type_error: "Age must be a number" })
    .nonnegative("Age cannot be negative")
    .max(50, "Age seems too high"),
  size: z.enum(["small", "medium", "large"], {
    errorMap: () => ({ message: "Select a size" }),
  }),
  purchasePrice: z
    .number({ invalid_type_error: "Price must be a number" })
    .nonnegative("Price cannot be negative"),
  monthlyExpenses: z
    .number({ invalid_type_error: "Expenses must be a number" })
    .nonnegative("Expenses cannot be negative"),
});

const schema = z.discriminatedUnion("category", [carSchema, petSchema]);

export type ItemFormData = z.infer<typeof schema>;

// ── Component ──────────────────────────────────────────────────────────────

interface ItemEntryFormProps {
  onSubmit: (data: ItemFormData) => void;
}

export function ItemEntryForm({ onSubmit }: ItemEntryFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: "car", make: "", model: "" } as ItemFormData,
  });

  const category = watch("category");
  const selectedMake = useWatch({ control, name: "make" as never }) as string | undefined;

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Enter Item Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Category */}
          <div className="space-y-1">
            <Label htmlFor="category">Category</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <select
                  id="category"
                  {...field}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="car">Car</option>
                  <option value="pet">Pet</option>
                </select>
              )}
            />
          </div>

          {/* ── Car fields ── */}
          {category === "car" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="make">Make</Label>
                  <Controller
                    name="make"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="make"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setValue("model" as never, "" as never);
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Select make</option>
                        {CAR_MAKES.map((make) => (
                          <option key={make} value={make}>{make}</option>
                        ))}
                      </select>
                    )}
                  />
                  {"make" in errors && errors.make && (
                    <p className="text-sm text-destructive">{errors.make.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="model">Model</Label>
                  <Controller
                    name="model"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="model"
                        {...field}
                        disabled={!selectedMake}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">
                          {selectedMake ? "Select model" : "Select make first"}
                        </option>
                        {(CAR_DATA[selectedMake ?? ""] ?? []).map((model) => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    )}
                  />
                  {"model" in errors && errors.model && (
                    <p className="text-sm text-destructive">{errors.model.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    {...register("year", { valueAsNumber: true })}
                    placeholder="2022"
                  />
                  {"year" in errors && errors.year && (
                    <p className="text-sm text-destructive">{errors.year.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fuelType">Fuel Type</Label>
                  <Controller
                    name="fuelType"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="fuelType"
                        {...field}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Select fuel type</option>
                        <option value="gasoline">Gasoline</option>
                        <option value="diesel">Diesel</option>
                        <option value="electric">Electric</option>
                        <option value="hybrid">Hybrid</option>
                      </select>
                    )}
                  />
                  {"fuelType" in errors && errors.fuelType && (
                    <p className="text-sm text-destructive">{errors.fuelType.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="annualMileage">Annual Mileage (miles)</Label>
                <Input
                  id="annualMileage"
                  type="number"
                  {...register("annualMileage", { valueAsNumber: true })}
                  placeholder="12000"
                />
                {"annualMileage" in errors && errors.annualMileage && (
                  <p className="text-sm text-destructive">{errors.annualMileage.message}</p>
                )}
              </div>
            </>
          )}

          {/* ── Pet fields ── */}
          {category === "pet" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="petType">Pet Type</Label>
                  <Controller
                    name="petType"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="petType"
                        {...field}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Select type</option>
                        <option value="dog">Dog</option>
                        <option value="cat">Cat</option>
                        <option value="bird">Bird</option>
                        <option value="other">Other</option>
                      </select>
                    )}
                  />
                  {"petType" in errors && errors.petType && (
                    <p className="text-sm text-destructive">{errors.petType.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="breed">Breed</Label>
                  <Input id="breed" {...register("breed")} placeholder="Labrador" />
                  {"breed" in errors && errors.breed && (
                    <p className="text-sm text-destructive">{errors.breed.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="ageYears">Age (years)</Label>
                  <Input
                    id="ageYears"
                    type="number"
                    {...register("ageYears", { valueAsNumber: true })}
                    placeholder="3"
                  />
                  {"ageYears" in errors && errors.ageYears && (
                    <p className="text-sm text-destructive">{errors.ageYears.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="size">Size</Label>
                  <Controller
                    name="size"
                    control={control}
                    render={({ field }) => (
                      <select
                        id="size"
                        {...field}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Select size</option>
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    )}
                  />
                  {"size" in errors && errors.size && (
                    <p className="text-sm text-destructive">{errors.size.message}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Shared cost fields ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="purchasePrice">Purchase Price ($)</Label>
              <Input
                id="purchasePrice"
                type="number"
                {...register("purchasePrice", { valueAsNumber: true })}
                placeholder="25000"
              />
              {errors.purchasePrice && (
                <p className="text-sm text-destructive">{errors.purchasePrice.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="monthlyExpenses">Monthly Expenses ($)</Label>
              <Input
                id="monthlyExpenses"
                type="number"
                {...register("monthlyExpenses", { valueAsNumber: true })}
                placeholder="500"
              />
              {errors.monthlyExpenses && (
                <p className="text-sm text-destructive">{errors.monthlyExpenses.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full">
            Calculate Costs
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
