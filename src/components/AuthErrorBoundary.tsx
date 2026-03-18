import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/AppLogo";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Auth page error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="w-full max-w-md text-center space-y-6">
            <Link to="/">
              <AppLogo className="h-10 mx-auto" />
            </Link>
            <div className="rounded-lg border border-border bg-card p-8 space-y-4">
              <h2 className="font-heading text-xl text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                We couldn't load the sign-in page. Please try again.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="hero" asChild>
                  <Link to="/auth">Try Again</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">Go Home</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
