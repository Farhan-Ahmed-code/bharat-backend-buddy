import React from 'react';
import Navbar from '@/components/layout/Navbar';
import AdminDashboard from '@/components/admin/AdminDashboard';

const AdminPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <AdminDashboard />
      </main>
    </div>
  );
};

export default AdminPage;