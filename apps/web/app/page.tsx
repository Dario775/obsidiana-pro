import { redirect } from 'next/navigation';

// Simple redirect para desarrollo
// En producción, esto debería verificar autenticación
export default function HomePage() {
  redirect('/login');
}
