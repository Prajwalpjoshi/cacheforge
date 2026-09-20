import type { EndpointField } from "@/lib/api-explorer/catalog";
import { Input, Label, Select } from "@/components/ui/input";

export function EndpointFieldInputs({
  fields,
  values,
  onChange,
}: {
  fields: EndpointField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  if (fields.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <Label htmlFor={field.name}>
            {field.name}
            {field.required && <span className="text-status-down"> *</span>}
            {field.description && (
              <span className="ml-1 font-normal normal-case text-muted-foreground">
                ({field.description})
              </span>
            )}
          </Label>
          {field.kind === "select" ? (
            <Select
              id={field.name}
              value={values[field.name] ?? ""}
              onChange={(event) => onChange(field.name, event.target.value)}
            >
              <option value="">
                {field.required ? "Select..." : "(none)"}
              </option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              id={field.name}
              type={field.kind === "number" ? "number" : "text"}
              placeholder={field.placeholder ?? field.defaultValue}
              value={values[field.name] ?? ""}
              onChange={(event) => onChange(field.name, event.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
