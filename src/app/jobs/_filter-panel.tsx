"use client";

import Link from "next/link";
import { SearchIcon, XIcon, SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterTrigger } from "@/components/ui/filter-trigger";
import {
  type ArrangementValue,
  type DayValue,
  type SortValue,
  ARRANGEMENT_OPTIONS,
  DAY_OPTIONS,
  RADIUS_OPTIONS,
  SORT_LABELS,
  toggleItem,
} from "@/app/jobs/_filter-state";

export type FilterPanelProps = {
  searchQuery: string;
  stateAbbr: string;
  city: string;
  radius: string;
  jobType: string;
  arrangements: ArrangementValue[];
  workDays: DayValue[];
  sortBy: SortValue;
  filterOpen: boolean;
  states: { abbr: string; name: string }[];
  cities: { name: string }[];
  countText: string | null;
  activeFilterCount: number;
  hasFilters: boolean;
  jobCount: number | undefined;
  isLoading: boolean;
  isEmployer: boolean;
  onFilterOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onRadiusChange: (value: string) => void;
  onJobTypeChange: (value: string) => void;
  onArrangementsChange: (value: ArrangementValue[]) => void;
  onWorkDaysChange: (value: DayValue[]) => void;
  onSortChange: (value: SortValue) => void;
  onClearFilters: () => void;
};

/** Mobile-only: sticky filter/sort bar plus the full-screen filter dialog. */
export function MobileFilterBar(props: FilterPanelProps) {
  const {
    searchQuery,
    stateAbbr,
    city,
    radius,
    jobType,
    arrangements,
    workDays,
    sortBy,
    filterOpen,
    states,
    cities,
    activeFilterCount,
    hasFilters,
    jobCount,
    isLoading,
    isEmployer,
    onFilterOpenChange,
    onSearchChange,
    onClearSearch,
    onStateChange,
    onCityChange,
    onRadiusChange,
    onJobTypeChange,
    onArrangementsChange,
    onWorkDaysChange,
    onSortChange,
    onClearFilters,
  } = props;

  return (
    <>
      {/* ── Mobile sticky filter bar ── */}
      <div className="sticky top-16 z-10 -mx-4 flex items-center gap-2 px-4 py-2 backdrop-blur-md md:hidden">
        <Button
          variant="ghost"
          onClick={() => onFilterOpenChange(true)}
          className="bg-primary/20 hover:bg-primary/30 flex h-8 items-center gap-1.5 rounded-md px-3 text-sm shadow-lg transition-colors duration-100"
        >
          <SlidersHorizontalIcon className="size-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-popover ml-0.5 rounded-full px-1.5 text-sm text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterTrigger>{SORT_LABELS[sortBy]}</FilterTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(v) => onSortChange(v as SortValue)}
            >
              <DropdownMenuRadioItem value="best">Best match</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="closest">Closest</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pay">Salary</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-2">
          {!isLoading && jobCount !== undefined && (
            <span className="text-muted-foreground text-sm">
              {jobCount} job{jobCount === 1 ? "" : "s"}
            </span>
          )}
          {isEmployer && (
            <Button asChild size="sm" className="h-7 px-2 text-sm">
              <Link href="/employer/jobs/new">Post job</Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Mobile filter dialog ── */}
      <Dialog open={filterOpen} onOpenChange={onFilterOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="space-y-2">
            <p className="px-1 font-medium">Search</p>
            <div className="relative">
              <SearchIcon className="text-popover-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search jobs…"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="placeholder-popover-foreground/80 pr-8 pl-8"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="text-popover-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors duration-100"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <p className="px-1 font-medium">Location</p>
            <Select value={stateAbbr || undefined} onValueChange={onStateChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <DropdownMenuLabel>State</DropdownMenuLabel>
                {states.map((s) => (
                  <SelectItem key={s.abbr} value={s.abbr}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={city || undefined} onValueChange={onCityChange} disabled={!stateAbbr}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={stateAbbr ? "City" : "State first"} />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                <DropdownMenuLabel>City</DropdownMenuLabel>
                {cities.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={radius} onValueChange={onRadiusChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <DropdownMenuLabel>Distance</DropdownMenuLabel>
                <SelectItem value="any">Any distance</SelectItem>
                {RADIUS_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job type */}
          <div className="space-y-2">
            <p className="px-1 font-medium">Job type</p>
            <Select value={jobType} onValueChange={onJobTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any type</SelectItem>
                <SelectItem value="FULL_TIME">Full-time</SelectItem>
                <SelectItem value="PART_TIME">Part-time</SelectItem>
              </SelectContent>
            </Select>

            {/* Arrangement */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <FilterTrigger
                  className="w-full justify-between bg-white/60 font-normal"
                  activeCount={arrangements.length}
                >
                  Arrangement
                </FilterTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {ARRANGEMENT_OPTIONS.map((opt) => (
                  <DropdownMenuCheckboxItem
                    key={opt.value}
                    checked={arrangements.includes(opt.value)}
                    onCheckedChange={() =>
                      onArrangementsChange(toggleItem(arrangements, opt.value))
                    }
                  >
                    {opt.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Work days */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <FilterTrigger
                  className="w-full justify-between bg-white/60 font-normal"
                  activeCount={workDays.length}
                >
                  Days
                </FilterTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {DAY_OPTIONS.map((day) => (
                  <DropdownMenuCheckboxItem
                    key={day.value}
                    checked={workDays.includes(day.value)}
                    onCheckedChange={() => onWorkDaysChange(toggleItem(workDays, day.value))}
                  >
                    {day.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <p className="px-1 font-medium">Sort by</p>
            <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortValue)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="best">Best match</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="closest">Closest</SelectItem>
                <SelectItem value="pay">Salary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            {hasFilters && (
              <Button variant="ghost" onClick={onClearFilters}>
                Clear all
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Desktop-only: sticky left sidebar with search, location, filters, and sort. */
export function DesktopFilterSidebar(props: FilterPanelProps) {
  const {
    searchQuery,
    stateAbbr,
    city,
    radius,
    jobType,
    arrangements,
    workDays,
    sortBy,
    states,
    cities,
    countText,
    hasFilters,
    onSearchChange,
    onClearSearch,
    onStateChange,
    onCityChange,
    onRadiusChange,
    onJobTypeChange,
    onArrangementsChange,
    onWorkDaysChange,
    onSortChange,
    onClearFilters,
  } = props;

  return (
    <aside className="hidden w-52 shrink-0 space-y-5 md:block md:overflow-y-auto md:pb-8">
      <div className="relative w-52">
        <SearchIcon className="text-popover absolute top-1/2 left-2 size-4 -translate-y-1/2" />

        <Input
          variant="secondary"
          placeholder="Search jobs…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="placeholder-popover/80 pr-8 pl-8"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={onClearSearch}
            className="text-popover absolute top-1/2 right-2.5 -translate-y-1/2 transition-colors duration-150"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>

      {/* Location */}
      <div>
        <div className="flex justify-between">
          <p className="mb-1.5 px-1 text-sm font-medium">Location</p>
          {countText && <p className="mb-3 hidden text-sm md:block">{countText}</p>}
        </div>
        <div className="space-y-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <FilterTrigger className="w-full justify-between">
                {stateAbbr
                  ? (states.find((s) => s.abbr === stateAbbr)?.name ?? stateAbbr)
                  : "State"}
              </FilterTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 overflow-y-auto whitespace-nowrap">
              <DropdownMenuRadioGroup value={stateAbbr} onValueChange={onStateChange}>
                {states.map((s) => (
                  <DropdownMenuRadioItem key={s.abbr} value={s.abbr}>
                    {s.abbr} — {s.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <FilterTrigger className="w-full justify-between" disabled={!stateAbbr}>
                {city || (stateAbbr ? "City" : "State first")}
              </FilterTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-64 overflow-y-auto">
              <DropdownMenuRadioGroup value={city} onValueChange={onCityChange}>
                {cities.map((c) => (
                  <DropdownMenuRadioItem key={c.name} value={c.name}>
                    {c.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <FilterTrigger className="w-full justify-between">
                {radius === "any"
                  ? "Any distance"
                  : (RADIUS_OPTIONS.find((r) => r.value === radius)?.label ?? radius)}
              </FilterTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuRadioGroup value={radius} onValueChange={onRadiusChange}>
                <DropdownMenuRadioItem value="any">Any distance</DropdownMenuRadioItem>
                {RADIUS_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters */}
      <div>
        <p className="mb-1.5 px-1 text-sm font-medium">Filters</p>
        <div className="space-y-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <FilterTrigger className="w-full justify-between">
                {jobType === "any"
                  ? "Job type"
                  : jobType === "FULL_TIME"
                    ? "Full-time"
                    : "Part-time"}
              </FilterTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuRadioGroup value={jobType} onValueChange={onJobTypeChange}>
                <DropdownMenuRadioItem value="any">Any type</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="FULL_TIME">Full-time</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="PART_TIME">Part-time</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <FilterTrigger className="w-full justify-between" activeCount={arrangements.length}>
                Arrangement
              </FilterTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {ARRANGEMENT_OPTIONS.map((opt) => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={arrangements.includes(opt.value)}
                  onCheckedChange={() => onArrangementsChange(toggleItem(arrangements, opt.value))}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <FilterTrigger className="w-full justify-between" activeCount={workDays.length}>
                Days
              </FilterTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {DAY_OPTIONS.map((day) => (
                <DropdownMenuCheckboxItem
                  key={day.value}
                  checked={workDays.includes(day.value)}
                  onCheckedChange={() => onWorkDaysChange(toggleItem(workDays, day.value))}
                >
                  {day.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sort */}
      <div>
        <p className="mb-1.5 px-1 text-sm font-medium">Sort by</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <FilterTrigger className="w-full justify-between">{SORT_LABELS[sortBy]}</FilterTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(v) => onSortChange(v as SortValue)}
            >
              <DropdownMenuRadioItem value="best">Best match</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="newest">Newest</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="closest">Closest</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pay">Salary</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasFilters && (
        <Button onClick={onClearFilters} className="w-full">
          Clear filters
        </Button>
      )}
    </aside>
  );
}
