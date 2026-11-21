import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { AskCoach } from "@/components/AskCoach";
import { PageShell } from "@/components/PageShell";
import { VaatayanApp } from "@/components/VaatayanApp";
import { buildContext } from "@/lib/impact";
import { buildRulePlan } from "@/lib/planner";
import { makeAir, makeHousehold, PLACE } from "../fixtures";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const air = makeAir();
const plan = buildRulePlan(buildContext(makeHousehold(), air));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

type Route = (url: string, init?: RequestInit) => Response | Promise<Response>;

/** A fake network: each test says how the four API routes respond. */
function network(routes: Partial<Record<"air" | "places" | "plan" | "ask", Route>>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const key = (["air", "places", "plan", "ask"] as const).find((k) => url.startsWith(`/api/${k}`));
    const handler = key && routes[key];
    if (!handler) throw new Error(`Unexpected request: ${url}`);
    return handler(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VaatayanApp: the Today page", () => {
  it("loads live air, writes a plan and answers a follow-up", async () => {
    const fetchMock = network({
      air: () => json(air),
      plan: () => json({ plan }),
      ask: () => new Response("Keep play indoors today.", { headers: { "X-Answer-Source": "rules" } }),
    });
    const user = userEvent.setup();
    const { container } = render(<VaatayanApp />);

    expect(await screen.findByText(/^Air is/)).toHaveTextContent("very unhealthy");
    expect(screen.getByRole("heading", { level: 1, name: "New Delhi" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /sky over New Delhi at US AQI 211/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your plan for today appears here" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Make today's plan" }));
    const headline = await screen.findByRole("heading", { level: 2, name: plan.headline });
    await waitFor(() => expect(headline).toHaveFocus());

    const sentPlan = JSON.parse(fetchMock.mock.calls.find(([u]) => String(u) === "/api/plan")![1]!.body as string);
    expect(sentPlan.place.name).toBe("New Delhi, Delhi, India");
    expect(sentPlan.air.aqi).toBe(211);

    await user.click(screen.getByRole("button", { name: /kids to play outside/ }));
    expect(await screen.findByText("Keep play indoors today.")).toBeInTheDocument();
    expect(screen.getByText("Quick answer from built-in guidance and your live data")).toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  it("remembers the household between visits", async () => {
    network({ air: () => json(air) });
    const user = userEvent.setup();
    const { unmount } = render(<VaatayanApp />);
    await screen.findByText(/^Air is/);
    await user.click(screen.getByRole("button", { name: "More children" }));
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem("vaatayan.household.v1")!).children).toBe(2));
    unmount();

    render(<VaatayanApp />);
    await screen.findByText(/^Air is/);
    expect(screen.getByRole("spinbutton", { name: /children/i })).toHaveValue(2);
  });

  it("switches city from search and clears the old plan", async () => {
    const pune = { name: "Pune, Maharashtra, India", latitude: 18.52, longitude: 73.86 };
    const fetchMock = network({
      air: () => json(air),
      places: () => json({ places: [pune] }),
      plan: () => json({ plan }),
    });
    const user = userEvent.setup();
    render(<VaatayanApp />);
    await screen.findByText(/^Air is/);
    await user.click(screen.getByRole("button", { name: "Make today's plan" }));
    await screen.findByRole("heading", { level: 2, name: plan.headline });

    await user.type(screen.getByRole("combobox", { name: /where are you breathing/i }), "Pune");
    await user.click(await screen.findByRole("option", { name: pune.name }));

    expect(await screen.findByRole("heading", { level: 1, name: "Pune" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: plan.headline })).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes("lat=18.52"))).toBe(true));
    expect(JSON.parse(window.localStorage.getItem("vaatayan.place.v1")!).name).toBe(pune.name);
  });

  it("shows a clear error and recovers when live air fails", async () => {
    let fail = true;
    network({
      air: () => (fail ? json({ error: "The air quality service did not respond in time." }, 502) : json(air)),
    });
    const user = userEvent.setup();
    render(<VaatayanApp />);

    expect(await screen.findByRole("alert")).toHaveTextContent("did not respond in time");
    expect(screen.getByRole("button", { name: "Make today's plan" })).toBeDisabled();

    fail = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/^Air is/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make today's plan" })).toBeEnabled();
  });

  it("explains a failed plan request and lets you retry", async () => {
    let fail = true;
    network({
      air: () => json(air),
      plan: () => (fail ? json({ error: "Could not build your plan. Try again." }, 500) : json({ plan })),
    });
    const user = userEvent.setup();
    render(<VaatayanApp />);
    await screen.findByText(/^Air is/);

    await user.click(screen.getByRole("button", { name: "Make today's plan" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not build your plan");

    fail = false;
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 2, name: plan.headline })).toBeInTheDocument();
  });
});

describe("AskCoach", () => {
  const props = { place: PLACE, air, household: makeHousehold(), planSummary: plan.headline };

  it("labels AI answers and blocks double submission while answering", async () => {
    let finish: (r: Response) => void = () => {};
    network({ ask: () => new Promise<Response>((resolve) => (finish = resolve)) });
    const user = userEvent.setup();
    render(<AskCoach {...props} />);

    await user.type(screen.getByRole("textbox", { name: "Your question" }), "Is a mask enough?");
    await user.click(screen.getByRole("button", { name: "Ask" }));
    expect(screen.getByText("Thinking about your air…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Answering…" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Your question" })).toHaveValue("");

    finish(new Response("Only a fitted N95 helps.", { headers: { "X-Answer-Source": "ai" } }));
    expect(await screen.findByText("Only a fitted N95 helps.")).toBeInTheDocument();
    expect(screen.getByText("Answered by AI from your live data")).toBeInTheDocument();
  });

  it("shows the server's message when a question fails", async () => {
    network({ ask: () => json({ error: "That's a lot of questions at once. Try again in a minute." }, 429) });
    const user = userEvent.setup();
    render(<AskCoach {...props} />);
    await user.click(screen.getByRole("button", { name: /morning walk/ }));
    expect(await screen.findByText(/lot of questions/)).toBeInTheDocument();
    expect(screen.queryByText(/Answered by AI|Quick answer/)).not.toBeInTheDocument();
  });

  it("ignores questions that are too short", async () => {
    const fetchMock = network({});
    const user = userEvent.setup();
    render(<AskCoach {...props} />);
    await user.type(screen.getByRole("textbox", { name: "Your question" }), "hi");
    expect(screen.getByRole("button", { name: "Ask" })).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("PageShell", () => {
  it("frames secondary pages with navigation, a title and the footer", async () => {
    const { container } = render(
      <PageShell title="Impact lab" lede="Try a different commute.">
        <p>Content</p>
      </PageShell>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Impact lab" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Content");
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("navigation", { name: "Footer" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toHaveTextContent("not medical advice");
    expect(await axe(container)).toHaveNoViolations();
  });
});
