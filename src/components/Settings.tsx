import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Trash2, UserPlus, AlertTriangle, Users, Link as LinkIcon, Settings as SettingsIcon, Download } from "lucide-react";
import { 
  listOrgUsers, 
  listInvites, 
  createInvite, 
  deleteInvite, 
  manageUsers,
  loadOrganizationData,
  listUserNames
} from "@/utils/backendService";
import { useToast } from "@/hooks/use-toast";

interface User {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  name?: string;
}

interface Invite {
  invite: string;
  role: 'admin' | 'member';
}

export function Settings() {
  const { orgId } = useParams<{ orgId: string }>();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<'member' | 'admin'>('member');
  const [ownershipTarget, setOwnershipTarget] = useState<string>('');
  const [showOwnershipDialog, setShowOwnershipDialog] = useState(false);

  useEffect(() => {
    if (orgId) {
      getCurrentUserId();
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId && currentUserId) {
      loadData();
    }
  }, [orgId, currentUserId]);

  const getCurrentUserId = async () => {
    try {
      const SUPABASE_URL = 'https://bmmcwlukjgfxmzxjpjwx.supabase.co';
      const SUPABASE_ANON_KEY = 'sb_publishable_b60TKX8zQ9yPaAB5xEpvuw_VmC14CGY';
      
      const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);
      } else {
        console.error('No authenticated user found');
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to get current user ID:', error);
    }
  };

  const loadData = async () => {
    if (!orgId || !currentUserId) return;
    
    try {
      setIsLoading(true);
      const [usersResult, invitesResult, orgData] = await Promise.all([
        listOrgUsers(orgId),
        listInvites(orgId).catch(() => ({ success: false, data: [] })),
        loadOrganizationData(orgId)
      ]);

      console.log('Users result:', usersResult);
      console.log('Invites result:', invitesResult);
      console.log('Current user ID:', currentUserId);

      if (usersResult.success) {
        const userData = usersResult.data?.data?.data || usersResult.data?.data || usersResult.data || [];
        console.log('Processed user data:', userData);
        
        // Fetch user names
        const userIds = userData.map((u: User) => u.user_id);
        if (userIds.length > 0) {
          try {
            const namesResult = await listUserNames(userIds);
            if (namesResult.success) {
              const namesData = namesResult.data?.data?.data || namesResult.data?.data || namesResult.data || {};
              const usersWithNames = userData.map((user: User) => ({
                ...user,
                name: namesData[user.user_id] || user.user_id
              }));
              setUsers(usersWithNames);
            } else {
              setUsers(userData);
            }
          } catch (error) {
            console.error('Failed to fetch user names:', error);
            setUsers(userData);
          }
        } else {
          setUsers(userData);
        }

        // Get current user's role using the actual user ID
        const currentUser = userData.find((u: User) => u.user_id === currentUserId);
        console.log('Found current user:', currentUser);
        setCurrentUserRole(currentUser?.role || 'member');
      }

      if (invitesResult.success) {
        const inviteData = invitesResult.data?.data?.data || invitesResult.data?.data || invitesResult.data || [];
        setInvites(inviteData);
      }

    } catch (error) {
      console.error('Failed to load settings data:', error);
      toast({
        title: "Error",
        description: "Failed to load settings data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!orgId) return;
    
    try {
      const result = await createInvite(orgId, selectedRole);
      if (result.success) {
        toast({
          title: "Success",
          description: "Invite link created successfully",
        });
        await loadData();
      }
    } catch (error) {
      console.error('Failed to create invite:', error);
      toast({
        title: "Error",
        description: "Failed to create invite link",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvite = async (inviteCode: string) => {
    try {
      const result = await deleteInvite(inviteCode);
      if (result.success) {
        toast({
          title: "Success",
          description: "Invite link deleted",
        });
        await loadData();
      }
    } catch (error) {
      console.error('Failed to delete invite:', error);
      toast({
        title: "Error",
        description: "Failed to delete invite link",
        variant: "destructive",
      });
    }
  };

  const handleUserAction = async (userId: string, actionType: 'kick' | 'rolechange' | 'ownershipchange', newRole?: string) => {
    if (!orgId) return;

    try {
      const actions = [{
        type: actionType,
        target: userId,
        ...(newRole && { role: newRole })
      }];

      const result = await manageUsers(orgId, actions);
      if (result.success) {
        toast({
          title: "Success",
          description: actionType === 'kick' ? "User removed" : actionType === 'ownershipchange' ? "Ownership transferred" : "Role updated",
        });
        await loadData();
        
        if (actionType === 'ownershipchange') {
          setShowOwnershipDialog(false);
        }
      }
    } catch (error) {
      console.error('Failed to manage user:', error);
      toast({
        title: "Error",
        description: "Failed to perform action",
        variant: "destructive",
      });
    }
  };

  const copyInviteLink = (inviteCode: string) => {
    const inviteUrl = `${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Success",
      description: "Invite code copied to clipboard",
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'admin': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'member': return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const canManageUser = (targetRole: string) => {
    if (currentUserRole === 'owner') return true;
    if (currentUserRole === 'admin' && targetRole === 'member') return true;
    return false;
  };

  const canInviteRole = (role: string) => {
    if (currentUserRole === 'owner') return true;
    if (currentUserRole === 'admin' && role === 'member') return true;
    return false;
  };

  const handleSaveArchive = async () => {
    if (!orgId) return;
    
    try {
      const orgData = await loadOrganizationData(orgId);
      const archiveData = orgData.data?.data || orgData.data || orgData;
      
      // Create and download the JSON file
      const dataStr = JSON.stringify(archiveData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${orgId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Organization archive downloaded successfully",
      });
    } catch (error) {
      console.error('Failed to save archive:', error);
      toast({
        title: "Error",
        description: "Failed to save organization archive",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Loading settings...</div>;
  }

  console.log('Current user role:', currentUserRole);
  console.log('Should show invites panel:', currentUserRole === 'owner' || currentUserRole === 'admin');

  return (
    <div className="space-y-6">
      {/* Users Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organization Members
            </CardTitle>
            <CardDescription>Manage users and their roles in this organization</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.name || user.user_id}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {currentUserRole === 'owner' && user.role !== 'owner' && (
                      <Select onValueChange={(value) => handleUserAction(user.user_id, 'rolechange', value)}>
                        <SelectTrigger className="w-32 inline-flex">
                          <SelectValue placeholder="Change role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    {currentUserRole === 'owner' && user.role !== 'owner' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setOwnershipTarget(user.user_id);
                          setShowOwnershipDialog(true);
                        }}
                      >
                        Make Owner
                      </Button>
                    )}
                    
                    {canManageUser(user.role) && user.role !== 'owner' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleUserAction(user.user_id, 'kick')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Links */}
      {(currentUserRole === 'owner' || currentUserRole === 'admin') && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Invite Codes
              </CardTitle>
              <CardDescription>Generate and manage invitations</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedRole} onValueChange={(value: 'member' | 'admin') => setSelectedRole(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  {currentUserRole === 'owner' && <SelectItem value="admin">Admin</SelectItem>}
                </SelectContent>
              </Select>
              <Button onClick={handleCreateInvite} disabled={!canInviteRole(selectedRole)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Invite
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {invites.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invite Code</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.invite}>
                      <TableCell className="font-mono text-sm">{invite.invite}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(invite.role)}>
                          {invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(invite.invite)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteInvite(invite.invite)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No active invite links
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Archive Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Archive Management
          </CardTitle>
          <CardDescription>Export organization data for backup or migration</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSaveArchive} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Save Archive
          </Button>
        </CardContent>
      </Card>

      {/* Ownership Transfer Dialog */}
      <Dialog open={showOwnershipDialog} onOpenChange={setShowOwnershipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Transfer Ownership
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to transfer ownership to this user? This action cannot be undone and you will become an admin.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> You will lose owner privileges and become an admin. The new owner will have full control over the organization.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOwnershipDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleUserAction(ownershipTarget, 'ownershipchange')}
            >
              Transfer Ownership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
