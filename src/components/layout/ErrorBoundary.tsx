import React from "react";

type Props = {
  children: React.ReactNode;
  /** Optional compact fallback (e.g. inside a canvas slot) */
  fallback?: React.ReactNode;
  /** Label used in the default fallback message */
  name?: string;
};

type State = {
  hasError: boolean;
  message?: string;
};

/**
 * Prevents a single WebGL / Three.js failure from blanking the entire React tree.
 * Browsers limit concurrent WebGL contexts (~8–16); extra <Canvas> mounts throw
 * "Error creating WebGL context" and without a boundary the page goes white.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || "Something went wrong",
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn(
      `[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`,
      error,
      info.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div className="flex h-full min-h-[120px] w-full items-center justify-center rounded-xl border border-white/10 bg-tertiary/50 px-4 text-center text-sm text-secondary">
          {this.props.name
            ? `${this.props.name} could not load (WebGL unavailable).`
            : "3D view unavailable."}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
