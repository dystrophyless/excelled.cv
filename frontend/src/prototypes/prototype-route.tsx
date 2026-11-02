import { Link, useParams } from "react-router";
import { Stack } from "@/components/layout";
import { Card, Container, EmptyState, PageHeader, BackLink } from "@/components/ui";
import { PROTOTYPES } from "./registry";

/* Renders /prototypes, /prototypes/:feature and /prototypes/:feature/:screen. */
export function PrototypeRoute() {
  const { feature, screen } = useParams();
  const entry = PROTOTYPES.find((p) => p.id === feature);
  const target = entry && screen ? entry.screens[screen] : undefined;
  if (target) return <target.Component />;

  const list = entry ? [entry] : PROTOTYPES;
  return (
    <Container width="content">
      <PageHeader eyebrow={<BackLink to="/styleguide/templates">Templates</BackLink>} title="Prototypes"
        description="Feature designs waiting for or past review. Each screen supports ?state=." />
      {list.length === 0 ? (
        <Card><EmptyState title="No prototypes yet" description="They appear here after /speckit-design runs for a feature." /></Card>
      ) : (
        <Stack gap={16}>
          {list.map((p) => (
            <Card key={p.id}>
              <Stack gap={8}>
                <strong>{p.id} · {p.title}</strong>
                {Object.entries(p.screens).map(([id, s]) => (
                  <Link key={id} to={`/prototypes/${p.id}/${id}`}>{s.title} — states: {s.states.join(" · ")}</Link>
                ))}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
