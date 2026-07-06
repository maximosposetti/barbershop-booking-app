export const demoBarbers = [
  {
    id: "demo-nico",
    name: "Nico Alvarez",
    slug: "nico-alvarez",
    description: "Especialista en fades, barba y terminaciones con navaja.",
    imageUrl: "https://images.unsplash.com/photo-1622296089863-eb7fc530daa8?auto=format&fit=crop&w=900&q=85",
    active: true
  },
  {
    id: "demo-tomas",
    name: "Tomas Vera",
    slug: "tomas-vera",
    description: "Cortes clasicos, tijera y asesoria de estilo personalizada.",
    imageUrl: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=900&q=85",
    active: true
  }
];

export const demoAdminUser = {
  id: "dev-admin",
  name: "Administrador",
  email: "admin@barberstudio.com",
  role: "ADMIN" as const
};
