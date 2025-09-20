// src/components/auth/AuthForm.tsx

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Phone, MapPin, Building } from 'lucide-react';

interface ProfileData {
    full_name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
}

const AuthForm = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [profileData, setProfileData] = useState<ProfileData>({
        full_name: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
    });
    const { toast } = useToast();

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            toast({
                title: "Error signing in",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Success!",
                description: "You have been signed in successfully.",
            });
        }
        setLoading(false);
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Create user via Supabase Edge Function (skips email verification)
            const { error } = await supabase.functions.invoke('handle_new_user_signup', {
                body: {
                    email,
                    password,
                    profile: {
                        full_name: profileData.full_name,
                        phone: profileData.phone,
                        address: profileData.address,
                        city: profileData.city,
                        state: profileData.state,
                        pincode: profileData.pincode,
                    }
                }
            });

            if (error) {
                throw new Error(error.message || 'Failed to create account');
            }

            // Automatically sign the user in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (signInError) {
                throw new Error(signInError.message);
            }

            toast({
                title: "Success!",
                description: "Your account has been created and you are now signed in.",
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            toast({
                title: "Error creating account",
                description: message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
            <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        QuickBidder
                    </CardTitle>
                    <CardDescription>
                        India's Premier Online Auction Platform
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="signin" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="signin">Sign In</TabsTrigger>
                            <TabsTrigger value="signup">Sign Up</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="signin">
                            <form onSubmit={handleSignIn} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-9"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-9"
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Sign In
                                </Button>
                            </form>
                        </TabsContent>
                        
                        <TabsContent value="signup">
                            <form onSubmit={handleSignUp} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="full_name"
                                                placeholder="Your full name"
                                                value={profileData.full_name}
                                                onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                placeholder="+91 98765 43210"
                                                value={profileData.phone}
                                                onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="signup_email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="signup_email"
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-9"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="signup_password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="signup_password"
                                            type="password"
                                            placeholder="Create a password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-9"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="address"
                                            placeholder="Street address"
                                            value={profileData.address}
                                            onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                                            className="pl-9"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <div className="relative">
                                            <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="city"
                                                placeholder="Mumbai"
                                                value={profileData.city}
                                                onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            placeholder="Maharashtra"
                                            value={profileData.state}
                                            onChange={(e) => setProfileData({...profileData, state: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pincode">Pincode</Label>
                                        <Input
                                            id="pincode"
                                            placeholder="400001"
                                            value={profileData.pincode}
                                            onChange={(e) => setProfileData({...profileData, pincode: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Account
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default AuthForm;