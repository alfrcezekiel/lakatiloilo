import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, PasswordStrength, passwordStrength } from "./PasswordStrength";

describe("passwordStrength", () => {
  it("matches the sign-up rule: at least 8 characters", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });

  it.each([
    ["shorter than 8 characters", "Ilo-26!", "Weak"],
    ["8 characters, but only one kind", "iloilocity", "Weak"],
    ["8 characters, two kinds", "iloilo26", "Okay"],
    ["12 characters, but only two kinds", "iloilocity26", "Okay"],
    ["12 characters, three kinds", "IloiloCity26", "Strong"],
    ["12 characters, all four kinds", "Dinagyang-26!", "Strong"],
    ["accented letters count as symbols", "dinagyañg2026", "Strong"],
  ])("%s → %s", (_case, password, label) => {
    expect(passwordStrength(password).label).toBe(label);
  });
});

describe("<PasswordStrength>", () => {
  it("keeps an empty, announced box on the page before anything is typed", () => {
    const { container } = render(<PasswordStrength id="strength" password="" />);
    const box = container.querySelector("#strength");

    expect(box).toHaveAttribute("aria-live", "polite");
    expect(box).toBeEmptyDOMElement();
  });

  it("says the strength in words, not only with the colour of the bar", () => {
    render(<PasswordStrength id="strength" password="iloilo" />);

    expect(screen.getByText(/Password strength:/)).toHaveTextContent("Password strength: Weak");
    expect(screen.getByText(/Longer, with numbers and symbols, is stronger/)).toBeInTheDocument();
  });

  it("drops the tip once the password is strong", () => {
    render(<PasswordStrength id="strength" password="Dinagyang-26!" />);

    expect(screen.getByText(/Password strength:/)).toHaveTextContent("Password strength: Strong");
    expect(screen.queryByText(/Longer, with numbers/)).not.toBeInTheDocument();
  });

  it("hides the coloured bar from screen readers, because the words say the same", () => {
    const { container } = render(<PasswordStrength id="strength" password="iloilo26" />);

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
