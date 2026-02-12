"use client";

import { useState } from "react";
import { fetchListing } from "@/lib/api";
import { generateInvoicePdf } from "@/lib/generateInvoicePdf";
import type { Listing } from "@/lib/types";
import { extractUuidFromGarageUrl, formatCurrency } from "@/lib/utils";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);

  async function handleGenerateInvoice(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setListing(null);

    const uuid = extractUuidFromGarageUrl(url);
    if (!uuid) {
      setError("Could not find a valid listing UUID in the URL.");
      return;
    }

    setLoading(true);
    try {
      const data = await fetchListing(uuid);
      setListing(data);
      await generateInvoicePdf(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch listing."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-start py-32 px-16 bg-white dark:bg-black sm:items-start">
        <form
          onSubmit={handleGenerateInvoice}
          className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left"
        >
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Generate Invoice
          </h1>
          <input
            type="url"
            placeholder="Paste a Garage listing URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-5 py-3 text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Generating..." : "Generate Invoice"}
          </button>
          {error && (
            <p className="max-w-md text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {listing && (
            <div className="mt-4 w-full max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Listing Details
              </h2>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {listing.listingTitle}
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                  {formatCurrency(listing.sellingPrice, 0)}
                </p>
                {listing.listingDescription && (
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                    {listing.listingDescription}
                  </p>
                )}
                <dl className="mt-3 space-y-1 text-sm">
                  {listing.category?.name && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Category
                      </dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">
                        {listing.category.name}
                      </dd>
                    </div>
                  )}
                  {listing.itemBrand && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Brand
                      </dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">
                        {listing.itemBrand}
                      </dd>
                    </div>
                  )}
                  {listing.vin && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        VIN
                      </dt>
                      <dd className="text-zinc-900 dark:text-zinc-100 font-mono">
                        {listing.vin}
                      </dd>
                    </div>
                  )}
                  {listing.itemAge != null && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Age (years)
                      </dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">
                        {listing.itemAge}
                      </dd>
                    </div>
                  )}
                  {listing.address?.state && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500 dark:text-zinc-400">
                        Location
                      </dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">
                        {listing.address.state}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-zinc-500 dark:text-zinc-400">
                      Listing ID
                    </dt>
                    <dd className="text-zinc-900 dark:text-zinc-100 font-mono text-xs">
                      {listing.id}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
