import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
}

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name,phone,address,city,state,pincode')
        .eq('user_id', userId)
        .single();
      setProfile((data as Profile) || {
        full_name: '', phone: '', address: '', city: '', state: '', pincode: ''
      });
    };
    load();
  }, []);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;
      if (!userId) throw new Error('Not signed in');
      const { error } = await supabase
        .from('profiles')
        .upsert({ user_id: userId, ...profile });
      if (error) throw error;
      toast({ title: 'Profile updated' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <Input value={profile.full_name ?? ''} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={profile.phone ?? ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label>Address</Label>
            <Input value={profile.address ?? ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
          </div>
          <div>
            <Label>City</Label>
            <Input value={profile.city ?? ''} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
          </div>
          <div>
            <Label>State</Label>
            <Input value={profile.state ?? ''} onChange={(e) => setProfile({ ...profile, state: e.target.value })} />
          </div>
          <div>
            <Label>Pincode</Label>
            <Input value={profile.pincode ?? ''} onChange={(e) => setProfile({ ...profile, pincode: e.target.value })} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfilePage;


