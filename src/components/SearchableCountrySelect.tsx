import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ALL_COUNTRIES, filterCountries } from "@/lib/countries";
import { FlagIcon } from "@/components/FlagIcon";

interface SearchableCountrySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  includeAll?: boolean;
}

export function SearchableCountrySelect({
  value,
  onValueChange,
  placeholder = "Select country",
  includeAll = false,
}: SearchableCountrySelectProps) {
  const [search, setSearch] = useState("");
  const filtered = filterCountries(search);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 pb-2 pt-1">
          <Input
            placeholder="Search countries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        {includeAll && (
          <SelectItem value="all">All Countries</SelectItem>
        )}
        {filtered.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="flex items-center gap-2">
              <FlagIcon countryCode={c.code} size={14} />
              {c.code} — {c.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
