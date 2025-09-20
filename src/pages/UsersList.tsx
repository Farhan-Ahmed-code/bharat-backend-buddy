import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface User {
	id: string;
	email: string;
	role: string;
	created_at: string;
}

const UsersList = () => {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				const { data, error } = await supabase
					.from('profiles')
					.select('id, email, role, created_at')
					.order('created_at', { ascending: false });

				if (error) {
					throw error;
				}

				setUsers(data || []);
			} catch (err) {
				console.error('Error fetching users:', err);
				setError('Failed to fetch users');
			} finally {
				setLoading(false);
			}
		};

		fetchUsers();
	}, []);

	if (loading) {
		return (
			<div className="min-h-screen bg-background">
				<Navbar />
				<main className="container mx-auto px-4 py-8">
					<Card className="mx-auto max-w-6xl">
						<CardHeader>
							<CardTitle>Loading users...</CardTitle>
						</CardHeader>
						<CardContent>
							<Badge>Loading</Badge>
						</CardContent>
					</Card>
				</main>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-background">
				<Navbar />
				<main className="container mx-auto px-4 py-8">
					<Card className="mx-auto max-w-6xl">
						<CardHeader>
							<CardTitle>Error</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-red-500">{error}</p>
						</CardContent>
					</Card>
				</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			<Navbar />
			<main className="container mx-auto px-4 py-8">
				<Card className="mx-auto max-w-6xl">
					<CardHeader>
						<CardTitle>All Users ({users.length})</CardTitle>
						<p className="text-sm text-muted-foreground">
							List of all registered users in the system
						</p>
					</CardHeader>
					<CardContent>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Created At</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{users.map((user) => (
										<TableRow key={user.id}>
											<TableCell className="font-medium">
												{user.email}
												{user.email === 'admin@example.com' && (
													<Badge variant="secondary" className="ml-2">
														Admin
													</Badge>
												)}
											</TableCell>
											<TableCell>
												<Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
													{user.role || 'user'}
												</Badge>
											</TableCell>
											<TableCell>
												{format(new Date(user.created_at), 'PPP')}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			</main>
		</div>
	);
};

export default UsersList;