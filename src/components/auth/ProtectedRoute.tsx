import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setAllowed(true);
      setChecking(false);
    };
    check();
  }, [navigate]);

  if (checking) {
    return (
      <Card className="mx-auto mt-12 max-w-md">
        <CardHeader>
          <CardTitle>Checking access…</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge>Loading</Badge>
        </CardContent>
      </Card>
    );
  }

  if (!allowed) {
    return (
      <Card className="mx-auto mt-12 max-w-md">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent>
          You must be signed in to access this page.
        </CardContent>
      </Card>
    );
  }

  return children;
};

export default ProtectedRoute;