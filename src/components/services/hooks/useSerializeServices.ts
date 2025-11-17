export function useSerializeServices() {
  return () => {
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        ".svc input, .svc .svc-in, .svc .svc-in-box"
      )
    );

    const out: Record<string, string> = {};
    inputs.forEach((el) => {
      if (el.name) out[el.name] = el.value ?? "";
    });

    return out;
  };
}
