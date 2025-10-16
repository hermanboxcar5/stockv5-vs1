import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Users, LogOut, ExternalLink, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { UploadArchive } from "@/components/UploadArchive";
import { ThemeToggle } from "../components/ThemeToggle";

interface Organization {
  id: string;
  name: string;
  role: string;
  data?: any;
}

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseLoaded, setSupabaseLoaded] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [archivePreset, setArchivePreset] = useState<any>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const API_BASE = "https://stockv5-backend-v1s.vercel.app/";

  useEffect(() => {
    // Check if Supabase is already loaded
    if (window.supabase) {
      setSupabaseLoaded(true);
      checkAuth();
      return;
    }

    // Wait for Supabase to load
    const checkSupabase = () => {
      if (window.supabase) {
        setSupabaseLoaded(true);
        checkAuth();
      } else {
        setTimeout(checkSupabase, 100);
      }
    };

    checkSupabase();
  }, []);

  const getAccessToken = async () => {
    const SUPABASE_URL = 'https://bmmcwlukjgfxmzxjpjwx.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_b60TKX8zQ9yPaAB5xEpvuw_VmC14CGY';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { session } } = await supabase.auth.getSession();
    console.log(session?.access_token)
    return session?.access_token;
  };

  const checkAuth = async () => {
    try {
      const token = await getAccessToken();

      if (!token) {
        navigate('/login');
        return;
      }

      // Check token validity with backend
      const validityResponse = await fetch(`${API_BASE}/api/v1/session/validity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      const isValid = await validityResponse.text();

      if (isValid !== 'true') {
        navigate('/login');
        return;
      }

      // Get user info
      const userResponse = await fetch(`${API_BASE}/api/v1/session/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      const userInfo = await userResponse.json();
      setUser(userInfo.data.user);

      // Load organizations
      await loadOrganizations(token);
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrganizations = async (token?: string) => {
    try {
      if (!token) {
        token = await getAccessToken();
      }

      // Get list of organizations user is in
      const orgsResponse = await fetch(`${API_BASE}/api/v1/users/listorgs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitecode: 'dummy' }) // Backend expects this but doesn't use it for listorgs
      });

      const orgsResult = await orgsResponse.json();

      if (!orgsResult.success) {
        console.error('Failed to load organizations:', orgsResult.error);
        return;
      }

      const orgRoles = orgsResult.data;
      const orgDetails: Organization[] = [];

      // Fetch details for each organization
      for (const [orgId, role] of Object.entries(orgRoles)) {
        try {
          const detailResponse = await fetch(`${API_BASE}/api/v1/orgs/read`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ organization: orgId })
          });

          const detailResult = await detailResponse.json();
          console.log(detailResult)
          if (detailResult.success) {
            orgDetails.push({
              id: orgId,
              name: detailResult.data?.data?.data?.name || detailResult.data?.data?.name || detailResult.data?.name || `Organization ${orgId}`,
              role: role as string,
              data: detailResult.data?.data?.data || detailResult.data?.data || detailResult.data
            });
          }
        } catch (error) {
          console.error(`Failed to load details for org ${orgId}:`, error);
          // Add organization without details
          orgDetails.push({
            id: orgId,
            name: `Organization ${orgId}`,
            role: role as string
          });
        }
      }

      setOrganizations(orgDetails);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setError('Failed to load organizations');
    }
  };

  const handleInviteSubmit = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setInviteLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = await getAccessToken();

      // Check invite validity
      const inviteInfoResponse = await fetch(`${API_BASE}/api/v1/invites/info`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitecode: inviteCode })
      });

      const inviteInfo = await inviteInfoResponse.json();

      if (!inviteInfo.success) {
        setError('Invalid invite code');
        return;
      }

      // Accept invite
      const acceptResponse = await fetch(`${API_BASE}/api/v1/users/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitecode: inviteCode })
      });

      const acceptResult = await acceptResponse.json();

      if (acceptResult.success) {
        setSuccess('Successfully joined organization!');
        setInviteCode('');
        await loadOrganizations(token);
      } else {
        setError(acceptResult.error || 'Failed to join organization');
      }
    } catch (error) {
      console.error('Invite error:', error);
      setError('Failed to process invite');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      setError('Please enter an organization name');
      return;
    }

    setCreateLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = await getAccessToken();

      const payload: any = { name: orgName };

      // If we have archive preset data, include it but override the name
      if (archivePreset) {
        payload.preset = {
          ...archivePreset,
          name: orgName // Override the archive name with the form name
        };
      }

      const createResponse = await fetch(`${API_BASE}/api/v1/orgs/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const createResult = await createResponse.json();

      if (createResult.success) {
        setSuccess('Organization created successfully!');
        setOrgName('');
        setArchivePreset(null); // Clear the preset after successful creation
        await loadOrganizations(token);
      } else {
        setError(createResult.error || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Create organization error:', error);
      setError('Failed to create organization');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleArchiveLoaded = (preset: any) => {
    setArchivePreset(preset);
    // Optionally populate the org name field with the archive name
    if (preset.name && !orgName) {
      setOrgName(preset.name);
    }
    setSuccess('Archive loaded! You can now create the organization.');
  };

  const handleLogout = async () => {
    try {
      const SUPABASE_URL = 'https://bmmcwlukjgfxmzxjpjwx.supabase.co';
      const SUPABASE_ANON_KEY = 'sb_publishable_b60TKX8zQ9yPaAB5xEpvuw_VmC14CGY';

      const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading || !supabaseLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <img
              src="/logo.png"
              alt="StockV5"
              className="h-12 w-12"
            />
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, {user?.user_metadata?.full_name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex justify-right">
            <div className="pr-4">
              <ThemeToggle />
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
                Sign Out
            </Button>
          </div>
          

        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-100 text-red-600 dark:text-red-100 dark:bg-red-900">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-100" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-600 bg-green-50 text-green-800 dark:bg-green-900 text-green 50">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Create Organization Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Organization</CardTitle>
            <CardDescription>
              Start a new inventory management organization {archivePreset && "(Archive data loaded)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Organization Name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={createLoading}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCreateOrganization}
                disabled={createLoading || !orgName.trim()}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                {createLoading ? "Creating..." : "Create Organization"}
              </Button>
              <UploadArchive onArchiveLoaded={handleArchiveLoaded} />
            </div>
          </CardContent>
        </Card>

        {/* Organizations Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {organizations.map((org) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{org.name}</CardTitle>
                  <Badge variant={org.role === 'owner' ? 'default' : 'secondary'}>
                    {org.role}
                  </Badge>
                </div>
                <CardDescription>
                  <Users className="h-4 w-4 inline mr-1" />
                  Organization ID: {org.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild className="w-full">
                  <a
                    href={`/organization/${org.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Organization
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Join Organization Section */}
        <Card>
          <CardHeader>
            <CardTitle>Join Organization</CardTitle>
            <CardDescription>
              Enter an invite code to join an existing organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                disabled={inviteLoading}
              />
              <Button
                onClick={handleInviteSubmit}
                disabled={inviteLoading || !inviteCode.trim()}
              >
                {inviteLoading ? "Joining..." : "Join"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {organizations.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No organizations yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first organization or join one using an invite code.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
