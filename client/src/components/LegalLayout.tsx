import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LegalLayoutProps {
  title: string;
  effectiveDate?: string;
  version?: string;
  children: React.ReactNode;
  testId?: string;
}

export function LegalLayout({ title, effectiveDate, version, children, testId }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" data-testid="button-back-home">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <header className="mb-8 pb-6 border-b">
          <h1 className="text-3xl md:text-4xl font-bold mb-2" data-testid={testId ?? "text-legal-title"}>
            {title}
          </h1>
          {(effectiveDate || version) && (
            <p className="text-sm text-muted-foreground">
              {effectiveDate && <span>Effective date: {effectiveDate}</span>}
              {effectiveDate && version && <span> &middot; </span>}
              {version && <span>Version {version}</span>}
            </p>
          )}
        </header>

        <article
          className="prose prose-sm md:prose-base dark:prose-invert max-w-none
                     prose-headings:scroll-mt-24
                     prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
                     prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
                     prose-p:leading-relaxed
                     prose-li:my-1
                     prose-table:text-sm"
        >
          {children}
        </article>

        <footer className="mt-12 pt-6 border-t text-sm text-muted-foreground">
          <p>
            This document is provided for transparency and is governed by the laws of Sri Lanka. For questions, contact{" "}
            <a href="mailto:legal@vaaney.com" className="underline hover-elevate rounded-sm px-1">
              legal@vaaney.com
            </a>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
