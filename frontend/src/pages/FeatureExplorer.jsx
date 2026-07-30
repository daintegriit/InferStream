import React from "react";
import FeatureTable from "../components/FeatureTable";

/**
 * FeatureTable fetches and renders the registry itself, so this page is
 * just framing. The previous version fetched /features/, checked for an
 * array (the endpoint returns an object), and bailed every time.
 */
export default function FeatureExplorer() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="border-b border-surface-border pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          Features
        </h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-content-secondary">
          Every feature the platform computes, with measured coverage and staleness. Look up a
          value by entity key to see what the online store returns and how long it took.
        </p>
      </header>

      <FeatureTable />
    </div>
  );
}