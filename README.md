# music

I believe that music is a window to a person's soul.
As such, I've compiled this list of my favorite songs.

I've included a script to compile and alphabetize everything.
It is *quite* complicated, but a good practice for nested
asycnchronous file operations.

Use this command to replace all occurence of '-' with '|'.

```bash
grep -rl '-' ./genre | xargs sed -i 's/\-/\|/g'
```
