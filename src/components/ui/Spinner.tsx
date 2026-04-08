export function Spinner() {
  return (
    <div className="flex items-center justify-center w-screen h-screen">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}
