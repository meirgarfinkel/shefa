"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { trpc } from "@/lib/trpc/provider";
import { SUPPORTED_COUNTRIES, COUNTRY_CONFIG, type CountryCode } from "@/lib/constants/countries";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "./form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

interface LocationPickerProps {
  required?: boolean;
}

/**
 * Country → (region) → city selector, backed by the seeded State/City reference tables.
 * Region-based countries (US) show a State dropdown; flat countries (Israel) hide it and
 * store a fixed region code in the `state` field behind the scenes. Form fields are
 * `country`, `state` (holds the region abbr), and `city`.
 */
export function LocationPicker({ required = true }: LocationPickerProps) {
  const { control, setValue } = useFormContext();
  const country = ((useWatch({ control, name: "country" }) as string) ?? "") as CountryCode | "";
  const stateAbbr = (useWatch({ control, name: "state" }) as string) ?? "";

  const config = country ? COUNTRY_CONFIG[country] : null;

  const { data: states = [] } = trpc.location.states.useQuery(
    { country: country as CountryCode },
    { enabled: !!country && !config?.flat },
  );
  const { data: cities = [], isFetching: citiesFetching } = trpc.location.citiesByState.useQuery(
    { country: country as CountryCode, stateAbbr },
    { enabled: !!country && !!stateAbbr },
  );

  const requiredMark = required && <span className="ml-.5 text-danger">*</span>;

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="country"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Country{requiredMark}</FormLabel>
            <Select
              onValueChange={(val) => {
                field.onChange(val);
                const cfg = COUNTRY_CONFIG[val as CountryCode];
                // Flat countries use a fixed hidden region; region-based ones reset it so
                // the user picks a state next. City always resets on a country change.
                setValue("state", cfg.flat ? (cfg.flatRegionCode ?? "") : "", {
                  shouldValidate: false,
                });
                setValue("city", "", { shouldValidate: false });
              }}
              value={field.value ?? ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
              </FormControl>
              <SelectContent align="start">
                {SUPPORTED_COUNTRIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {COUNTRY_CONFIG[code].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        {/* Region dropdown — hidden for flat countries (e.g. Israel). */}
        {config && !config.flat && (
          <FormField
            control={control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {config.regionLabel}
                  {requiredMark}
                </FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    setValue("city", "", { shouldValidate: false });
                  }}
                  value={field.value ?? ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${config.regionLabel.toLowerCase()}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent align="start">
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
        )}

        <FormField
          control={control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City{requiredMark}</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value ?? ""}
                disabled={!country || !stateAbbr || citiesFetching}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !country
                          ? "Need country"
                          : !stateAbbr
                            ? `Need ${config?.regionLabel.toLowerCase() ?? "region"}`
                            : citiesFetching
                              ? "..."
                              : "Select city"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent align="start">
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
    </div>
  );
}
