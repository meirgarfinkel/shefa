"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { trpc } from "@/lib/trpc/provider";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "./form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

interface LocationPickerProps {
  required?: boolean;
}

export function LocationPicker({ required = true }: LocationPickerProps) {
  const { control, setValue } = useFormContext();
  const stateAbbr = (useWatch({ control, name: "state" }) as string) ?? "";

  const { data: states = [] } = trpc.location.states.useQuery();
  const { data: cities = [], isFetching: citiesFetching } = trpc.location.citiesByState.useQuery(
    { stateAbbr },
    { enabled: !!stateAbbr },
  );
  return (
    <div className="grid grid-cols-2 gap-4">
      <FormField
        control={control}
        name="state"
        render={({ field }) => (
          <FormItem>
            <FormLabel>State{required ? " *" : ""}</FormLabel>
            <Select
              onValueChange={(val) => {
                field.onChange(val);
                setValue("city", "", { shouldValidate: false });
              }}
              value={field.value ?? ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select state…" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.abbr} value={s.abbr}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel>City{required ? " *" : ""}</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? ""}
              disabled={!stateAbbr || citiesFetching}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !stateAbbr
                        ? "Select state first"
                        : citiesFetching
                          ? "Loading…"
                          : "Select city…"
                    }
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {/* Ensure the current value is always a valid option while the list
                    is loading — otherwise Radix can't match the value and shows the
                    placeholder even after cities arrive. */}
                {field.value && !cities.some((c) => c.name === field.value) && (
                  <SelectItem value={field.value}>{field.value}</SelectItem>
                )}
                {cities.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
