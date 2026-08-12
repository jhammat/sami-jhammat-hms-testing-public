"use client";

import {
  notFound,
} from "next/navigation";

/**
 * Every real administration section owns an explicit route segment. Anything
 * reaching this dynamic segment is a typo and must 404 rather than render a
 * placeholder that implies the screen exists.
 */
export default function AdminSectionPage(): never {
  notFound();
}
