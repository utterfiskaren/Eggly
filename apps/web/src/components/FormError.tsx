export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="felruta">{message}</p>;
}
