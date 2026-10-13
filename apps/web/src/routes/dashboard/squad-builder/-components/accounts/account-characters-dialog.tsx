import type { OwnedMargonemAccountSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import { Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MargonemCharacterAvatarImage } from "@/routes/dashboard/squad-builder/-components/margonem-character-avatar-image";
import { getProfessionPresentation } from "@/routes/dashboard/squad-builder/-components/profession-presenters";

/** Opens the complete saved Jaruna roster without fetching or modifying the account. */
export const AccountCharactersDialog = ({
  account,
}: {
  readonly account: OwnedMargonemAccountSummarySchema;
}) => (
  <Dialog>
    <DialogTrigger
      aria-label={`Pokaż postacie konta ${account.displayName}`}
      title="Pokaż postacie"
      render={<Button size="sm" variant="outline" />}
    >
      <Users aria-hidden="true" className="size-3.5" />
      {account.characterCount}
    </DialogTrigger>
    <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden text-left whitespace-normal sm:max-w-xl">
      <DialogHeader className="shrink-0 pr-8">
        <DialogTitle>Postacie konta „{account.displayName}”</DialogTitle>
        <DialogDescription>
          Zapisane postacie z Jaruny, od najwyższego poziomu.
        </DialogDescription>
      </DialogHeader>
      <div className="min-h-0 overflow-y-auto overscroll-contain">
        {account.characters.length === 0 ? (
          <p className="text-muted-foreground py-4 text-sm">
            Brak zapisanych postaci z Jaruny.
          </p>
        ) : (
          <ul className="divide-y" aria-label="Postacie konta">
            {account.characters.map((character) => {
              const profession = getProfessionPresentation(
                character.profession
              );

              return (
                <li
                  key={character.characterId}
                  className="flex items-center gap-3 py-3"
                >
                  <Avatar className="h-12 w-8 shrink-0 overflow-hidden rounded-none after:hidden">
                    {character.avatarUrl !== null &&
                      character.avatarUrl.length > 0 && (
                        <MargonemCharacterAvatarImage
                          alt=""
                          src={character.avatarUrl}
                        />
                      )}
                    <AvatarFallback className="rounded-none">
                      <profession.icon
                        aria-hidden="true"
                        className={`size-4 ${profession.colorClass}`}
                      />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">{character.name}</p>
                    <p
                      className={`flex items-center gap-1.5 text-xs ${profession.colorClass}`}
                    >
                      <profession.icon
                        aria-hidden="true"
                        className="size-3.5"
                      />
                      {profession.label}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 font-mono text-xs">
                    {character.level} lvl
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DialogContent>
  </Dialog>
);
