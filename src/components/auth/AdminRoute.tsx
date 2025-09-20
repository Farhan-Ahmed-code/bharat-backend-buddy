import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AdminRouteProps {
	children: React.ReactElement;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
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

			try {
				// Check role from profiles table
				const { data: profile } = await supabase
					.from('profiles')
					.select('role')
					.eq('user_id', user.id)
					.single();

				const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';
				setAllowed(isAdmin);
			} catch (error) {
				console.error('Error checking admin status:', error);
				// Fallback: allow admin@example.com for backward compatibility
				const isAdmin = user.email === 'admin@example.com';
				setAllowed(isAdmin);
			}
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
					You do not have admin privileges. Only admin@example.com can access this page.
				</CardContent>
			</Card>
		);
	}

	return children;
};

export default AdminRoute;