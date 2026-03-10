/*eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

type Tag = {
  id: string;
  name: string;
  slug: string;
};

interface TagInputProps {
  value: string[];
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

export function TagInput({ value, onChange, disabled }: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch tags
  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/tags?limit=100");
        const data = await res.json();
        setTags(data.data || []);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  const selectedTags = tags.filter(tag => value.includes(tag.id));

  const handleSelect = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter(id => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  const handleRemove = (tagId: string) => {
    onChange(value.filter(id => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!searchQuery.trim()) return;

    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: searchQuery.trim() }),
      });

      if (!res.ok) throw new Error("Failed to create tag");

      const { data: newTag } = await res.json();
      setTags(prev => [...prev, newTag]);
      onChange([...value, newTag.id]);
      setSearchQuery("");
      setOpen(false);
    } catch (error) {
      console.error("Error creating tag:", error);
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      <div className="flex flex-wrap gap-1.5 min-h-8">
        {selectedTags.map(tag => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-0.5 text-xs font-normal"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemove(tag.id)}
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {value.length === 0 && (
          <span className="text-xs text-muted-foreground py-1">No tags selected</span>
        )}
      </div>

      {/* Tag selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-8 text-xs"
            disabled={disabled}
          >
            <span className="flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add tags
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput
              placeholder="Search or create tag..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                <button
                  type="button"
                  onClick={handleCreateTag}
                  className="w-full text-left px-2 py-3 text-xs text-muted-foreground hover:bg-muted/50 flex items-center gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create {searchQuery}
                </button>
              </CommandEmpty>
              <CommandGroup>
                {tags.map(tag => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleSelect(tag.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        value.includes(tag.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {tag.name}
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      ({tag.slug})
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}