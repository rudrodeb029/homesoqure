import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Index } from "@/routes/index";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/components/SpaShell", () => ({ SpaShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
afterEach(cleanup);

function choose(name: string, value: string) {
  const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (!input) throw new Error(`Missing ${name} option ${value}`);
  fireEvent.click(input);
}

describe("Rental follow-up rules", () => {
  it("shows pet details only when pets is Yes", () => {
    render(<Index />);
    expect(screen.queryByRole("textbox", { name: "What Type of Pet(s)?" })).toBeNull();
    choose("pets", "Yes");
    expect(screen.getByRole("textbox", { name: "What Type of Pet(s)?" })).toBeInTheDocument();
    choose("pets", "No");
    expect(screen.queryByRole("textbox", { name: "What Type of Pet(s)?" })).toBeNull();
  });

  it("limits pet details to 155 characters", () => {
    render(<Index />);
    choose("pets", "Yes");
    const input = screen.getByRole("textbox", { name: "What Type of Pet(s)?" });
    fireEvent.change(input, { target: { value: "a".repeat(156) } });
    expect(input).toHaveValue("a".repeat(155));
  });

  it("shows independently selectable showing types only when showing is Yes", () => {
    render(<Index />);
    expect(screen.queryByRole("checkbox", { name: /In-person/i })).toBeNull();
    choose("show", "Yes");
    const inPerson = screen.getByRole("checkbox", { name: /In-person/i });
    const virtual = screen.getByRole("checkbox", { name: /Virtual/i });
    fireEvent.click(inPerson);
    fireEvent.click(virtual);
    expect(inPerson).toBeChecked();
    expect(virtual).toBeChecked();
    choose("show", "No");
    expect(screen.queryByRole("checkbox", { name: /In-person/i })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /Virtual/i })).toBeNull();
  });
});