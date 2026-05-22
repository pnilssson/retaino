"use client";

export function waitForClerkSessionPropagation() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 500);
  });
}
