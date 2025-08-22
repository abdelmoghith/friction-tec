import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import AssemblageFormDialog from '@/components/fiche/AssemblageFormDialog';
import EmpatageFormDialog from '@/components/fiche/EmpatageFormDialog';

const FicheAccompagnement = () => {
  const [assemblageDialogOpen, setAssemblageDialogOpen] = useState(false);
  const [empatageDialogOpen, setEmpatageDialogOpen] = useState(false);

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">FICHE D'ACCOMPAGNEMENT</h1>
            <p className="text-muted-foreground">
              Sélectionnez le type de fiche d'accompagnement à créer
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* ASSEMBLAGE Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 p-1 rounded-full w-fit">
              <div className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl">ASSEMBLAGE</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Fiche d'accompagnement pour le processus d'assemblage semi-fini
            </p>
            <Button
              onClick={() => setAssemblageDialogOpen(true)}
              className="w-full"
              size="lg"
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              Créer Fiche ASSEMBLAGE
            </Button>
          </CardContent>
        </Card>

        {/* EMPATAGE Card */}
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 p-1 rounded-full w-fit">
              <div className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl">EMPATAGE</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Fiche d'accompagnement pour le processus d'empatage
            </p>
            <Button
              onClick={() => setEmpatageDialogOpen(true)}
              className="w-full"
              size="lg"
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              Créer Fiche EMPATAGE
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Components */}
      <AssemblageFormDialog
        open={assemblageDialogOpen}
        onOpenChange={setAssemblageDialogOpen}
      />
      <EmpatageFormDialog
        open={empatageDialogOpen}
        onOpenChange={setEmpatageDialogOpen}
      />
    </Layout>
  );
};

export default FicheAccompagnement;